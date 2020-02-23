"use strict";

/** imports */
const React = require('react');
const ReactDOM = require('react-dom');

const electron = require('electron');
const shell = electron.shell;
const remote = electron.remote;
const clipboard = electron.clipboard;

const Row = require('react-bootstrap').Row;
const Col = require('react-bootstrap').Col;
const Grid = require('react-bootstrap').Grid;
const Table = require('react-bootstrap').Table;

const BigNumber = require('bignumber.js');

const crypto = require('crypto');

/** modules */

const LedgerComm = require('./LedgerComm.js');
const AddressTranscoder = require('./AddressTranscoder.js')
const KeyTranscoder = require('./KeyTranscoder.js')
const TxTranscoder = require('./TxTranscoder.js')
const TxSigner = require('./TxSigner.js')
const Asset = require('./Asset.js')
const TxFactory = require('./TxFactory.js')

/** global constants */

const LOG_LEDGER_POLLING = true;

const MAX_POLL_DATA_TYPE_IX = 4;

const PRIVATE_KEY_LENGTH = 64;

const DEFAULT_FEE_SATS = '500';

/** networks */

const MAINNET = {
  NAME: "Mainnet",
  EXPLORER: 'https://blockchain.elastos.org',
  RPC_PORT: 20336,
  REST_PORT: 20334
};

const TESTNET = {
  NAME: "Testnet",
  EXPLORER: 'https://blockchain-beta.elastos.org',
  RPC_PORT: 21336,
  REST_PORT: 21334
};

const NETWORKS = [MAINNET, TESTNET];

var currentNetworkIx = 0;

const getCurrentNetwork = () => {
  return NETWORKS[currentNetworkIx];
}

const getTransactionHistoryUrl = (address) => {
  const url = `${getCurrentNetwork().EXPLORER}/api/v1/txs/?pageNum=0&address=${address}`;
  // mainConsole.log('getTransactionHistoryUrl',url);
  return url;
}

const getTransactionHistoryLink = (txid) => {
  const url = `${getCurrentNetwork().EXPLORER}/tx/${txid}`;
  // mainConsole.log('getTransactionHistoryLink',url);
  return url;
}

const ELA_HOST_PREFIX = 'http://elastos.coranos.cc';

const getRestUrl = () => {
  const url = `${ELA_HOST_PREFIX}:${getCurrentNetwork().REST_PORT}`;
  // mainConsole.log('getRestUrl',url);
  return url;
}

const getBalanceUrl = (address) => {
  const url = `${getRestUrl()}/api/v1/asset/balances/${address}`;
  // mainConsole.log('getBalanceUrl',url);
  return url;
}

const getUnspentTransactionOutputsUrl = (address) => {
  const url = `${getRestUrl()}/api/v1/asset/utxo/${address}/${Asset.elaAssetId}`;
  // mainConsole.log('getUnspentTransactionOutputsUrl',url);
  return url;
}

const getStateUrl = () => {
  const url = `${getRestUrl()}/api/v1/node/state`;
  // mainConsole.log('getStateUrl',url);
  return url;
}

const getRpcUrl = () => {
  const url = `${ELA_HOST_PREFIX}:${getCurrentNetwork().RPC_PORT}`;
  // mainConsole.log('getRpcUrl',url);
  return url;
}

/** global variables */

var ledgerDeviceInfo = undefined;

var publicKey = undefined;

var address = undefined;

var pollDataTypeIx = 0;

var balance = undefined;

var sendAmount = '';

var feeAmountSats = '';

var feeAmountEla = '';

var isLoggedIn = false;

var useLedgerFlag = false;

var generatedPrivateKeyHex = undefined;

const sendToAddressStatuses = [];
sendToAddressStatuses.push('No Send-To Transaction Requested Yet');
const sendToAddressLinks = [];

var balanceStatus = 'No Balance Requested Yet';

var transactionHistoryStatus = 'No History Requested Yet';

const parsedTransactionHistory = [];

var producerListStatus = 'No Producers Requested Yet';

var parsedProducerList = {};
parsedProducerList.totalvotes = '-';
parsedProducerList.totalcounts = '-';
parsedProducerList.producersCandidateCount = 0;
parsedProducerList.producers = [];

var candidateVoteListStatus = 'No Candidate Votes Requested Yet';

var parsedCandidateVoteList = {};
parsedCandidateVoteList.candidateVotes = [];

var unspentTransactionOutputsStatus = 'No UTXOs Requested Yet';

const parsedUnspentTransactionOutputs = [];

var blockchainStatus = 'No Blockchain State Requested Yet';

var blockchainState = {};

var blockchainLastActionHeight = 0;

/** functions */
const formatDate = (date) => {
  let month = (date.getMonth() + 1).toString();
  let day = date.getDate().toString();
  const year = date.getFullYear();

  if (month.length < 2) {
    month = '0' + month
  };
  if (day.length < 2) {
    day = '0' + day
  };

  return [year, month, day].join('-');
}

const changeNetwork = (event) => {
  currentNetworkIx = event.target.value;
  refreshBlockchainData();
}

const refreshBlockchainData = () => {
  requestTransactionHistory();
  requestBalance();
  requestUnspentTransactionOutputs();
  requestBlockchainState();
  renderApp();
}

const publicKeyCallback = (message) => {
  if (LOG_LEDGER_POLLING) {
    mainConsole.log(`publicKeyCallback ${JSON.stringify(message)}`);
  }
  if (message.success) {
    publicKey = message.publicKey;
    requestBlockchainDataAndShowHome();
  } else {
    ledgerDeviceInfo.error = true;
    ledgerDeviceInfo.message = message.message;
    renderApp();
  }
}

const pollForDataCallback = (message) => {
  if (LOG_LEDGER_POLLING) {
    mainConsole.log(`pollForDataCallback ${JSON.stringify(message)}`);
  }
  ledgerDeviceInfo = message;
  renderApp();
  pollDataTypeIx++;
  setPollForAllInfoTimer();
}

var mainConsoleLib = require('console');
var mainConsole = new mainConsoleLib.Console(process.stdout, process.stderr);
mainConsole.log('Consone Logging Enabled.');

const pollForData = () => {
  if (LOG_LEDGER_POLLING) {
    mainConsole.log('getAllLedgerInfo ' + pollDataTypeIx);
  }
  var resetPollIndex = false;
  switch (pollDataTypeIx) {
    case 0:
      pollForDataCallback('Polling...');
      break;
    case 1:
      LedgerComm.getLedgerDeviceInfo(pollForDataCallback);
      break;
    case 2:
      if (useLedgerFlag) {
        LedgerComm.getPublicKey(publicKeyCallback);
      }
      break;
    case 3:
      if (address != undefined) {
        requestTransactionHistory();
        requestBalance();
        requestUnspentTransactionOutputs();
        requestBlockchainState();
      }
    case 4:
      requestListOfProducers();
    case MAX_POLL_DATA_TYPE_IX:
      // only check every 10 seconds for a change in device status.
      pollDataTypeIx = 0;
      setTimeout(pollForData, 10000);
      break;
    default:
      throw Error('poll data index reset failed.');
  }
};

const setPollForAllInfoTimer = () => {
  setTimeout(pollForData, 1);
}

const postJson = (url, jsonString, readyCallback, errorCallback) => {
  var xmlhttp = new XMLHttpRequest(); // new HttpRequest instance

  const xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function() {
    if (this.readyState == 4) {
      // sendToAddressStatuses.push( `XMLHttpRequest: status:${this.status} response:'${this.response}'` );
      if (this.status == 200) {
        readyCallback(JSON.parse(this.response));
      } else {
        errorCallback(this.response);
      }
    }
  }
  xhttp.responseType = 'text';
  xhttp.open('POST', url, true);
  xhttp.setRequestHeader('Content-Type', 'application/json');
  xhttp.setRequestHeader('Authorization', 'Basic RWxhVXNlcjpFbGExMjM=');

  // sendToAddressStatuses.push( `XMLHttpRequest: curl ${url} -H "Content-Type: application/json" -d '${jsonString}'` );

  xhttp.send(jsonString);
}

const getJson = (url, readyCallback, errorCallback) => {
  const xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function() {
    if (this.readyState == 4) {
      if (this.status == 200) {
        readyCallback(JSON.parse(this.response));
      } else {
        errorCallback({'status': this.status, 'statusText': this.statusText, 'response': this.response});
      }
    }
  }
  xhttp.responseType = 'text';
  xhttp.open('GET', url, true);
  xhttp.send();
}

const requestUnspentTransactionOutputs = () => {
  unspentTransactionOutputsStatus = 'UTXOs Requested';
  const unspentTransactionOutputsUrl = getUnspentTransactionOutputsUrl(address);

  // mainConsole.log( 'unspentTransactionOutputsUrl ' + unspentTransactionOutputsUrl );

  getJson(unspentTransactionOutputsUrl, getUnspentTransactionOutputsReadyCallback, getUnspentTransactionOutputsErrorCallback);
};

const getUnspentTransactionOutputsErrorCallback = (response) => {
  unspentTransactionOutputsStatus = `UTXOs Error ${JSON.stringify(response)}`;

  renderApp();
}

const getUnspentTransactionOutputsReadyCallback = (response) => {
  unspentTransactionOutputsStatus = 'UTXOs Received';
  parsedUnspentTransactionOutputs.length = 0;

  mainConsole.log('getUnspentTransactionOutputsCallback ' + JSON.stringify(response), response.Result);

  if ((response.Result != undefined) && (response.Result != null) && (response.Error == 0)) {
    response.Result.forEach((utxo, utxoIx) => {
      TxFactory.updateValueSats(utxo, utxoIx);
      parsedUnspentTransactionOutputs.push(utxo);
    });
  }

  renderApp();
}

const get = (id) => {
  const elt = document.getElementById(id);
  if (elt == null) {
    throw new Error('elt is null:' + id);
  }
  return elt;
}

const hide = (id) => {
  get(id).style = 'display:none;';
}

const show = (id) => {
  get(id).style = 'display:default;';
}

const getPublicKeyFromLedger = () => {
  useLedgerFlag = true;
  isLoggedIn = true;
  LedgerComm.getPublicKey(publicKeyCallback);
}

const requestBlockchainDataAndShowHome = () => {
  if (publicKey === undefined) {
    return;
  }
  address = AddressTranscoder.getAddressFromPublicKey(publicKey);
  requestTransactionHistory();
  requestBalance();
  requestUnspentTransactionOutputs();
  requestBlockchainState();
  showHome();
}

const getPublicKeyFromPrivateKey = () => {
  useLedgerFlag = false;
  isLoggedIn = true;
  show('privateKey');
  const privateKeyElt = document.getElementById('privateKey');
  const privateKey = privateKeyElt.value;
  if (privateKey.length != PRIVATE_KEY_LENGTH) {
    alert(`private key must be a hex encoded string of length ${PRIVATE_KEY_LENGTH}, not ${privateKey.length}`);
    return;
  }
  publicKey = KeyTranscoder.getPublic(privateKey);
  requestBlockchainDataAndShowHome();
}

const sendAmountToAddressErrorCallback = (error) => {
  sendToAddressStatuses.push(JSON.stringify(error));
  renderApp();
}

const sendAmountToAddressReadyCallback = (transactionJson) => {
  mainConsole.log('sendAmountToAddressReadyCallback ' + JSON.stringify(transactionJson));
  sendToAddressStatuses.length = 0;
  if (transactionJson.error) {
    sendToAddressStatuses.push(transactionJson.error.message);
  } else {
    const link = getTransactionHistoryLink(transactionJson.result);
    const elt = {};
    elt.txDetailsUrl = link;
    elt.txHash = transactionJson.result;
    sendToAddressStatuses.length = 0;
    sendToAddressStatuses.push('Transaction Successful.');
    sendToAddressLinks.push(elt);
  }
  showCompletedTransaction();
  setBlockchainLastActionHeight();
  renderApp();
}

const clearSendData = () => {
  mainConsole.log('STARTED clearSendData');
  const sendAmountElt = document.getElementById('sendAmount');
  const sendToAddressElt = document.getElementById('sendToAddress');
  const feeAmountElt = document.getElementById('feeAmount');
  sendAmountElt.value = '';
  sendToAddressElt.value = '';
  feeAmountElt.value = DEFAULT_FEE_SATS;
  sendAmount = '';
  feeAmountSats = '';
  feeAmountEla = '';
  sendToAddressStatuses.length = 0;
  sendToAddressLinks.length = 0;
  mainConsole.log('SUCCESS clearSendData');
}

const updateAmountAndFees = () => {
  const sendAmountElt = document.getElementById('sendAmount');
  const feeAmountElt = document.getElementById('feeAmount');

  sendAmount = sendAmountElt.value;
  feeAmountSats = feeAmountElt.value;
  if (Number.isNaN(sendAmount)) {
    throw new Error(`sendAmount ${sendAmount} is not a number`);
  }
  if (Number.isNaN(feeAmountSats)) {
    throw new Error(`feeAmountSats ${feeAmountSats} is not a number`);
  }
  feeAmountEla = BigNumber(feeAmountSats, 10).dividedBy(Asset.satoshis).toString();
}

const updateAmountAndFeesAndRenderApp = () => {
  updateAmountAndFees();
  renderApp();
}

const sendAmountToAddress = () => {
  updateAmountAndFees();

  const sendToAddressElt = document.getElementById('sendToAddress');

  const sendToAddress = sendToAddressElt.value;

  const unspentTransactionOutputs = parsedUnspentTransactionOutputs;
  mainConsole.log('sendAmountToAddress.unspentTransactionOutputs ' + JSON.stringify(unspentTransactionOutputs));

  if (Number.isNaN(sendAmount)) {
    throw new Error(`sendAmount ${sendAmount} is not a number`);
  }
  if (Number.isNaN(feeAmountSats)) {
    throw new Error(`feeAmountSats ${feeAmountSats} is not a number`);
  }

  var encodedTx;

  if (useLedgerFlag) {
    const tx = TxFactory.createUnsignedSendToTx(unspentTransactionOutputs, sendToAddress, sendAmount, publicKey, feeAmountSats);
    const encodedUnsignedTx = TxTranscoder.encodeTx(tx, false);
    const sendAmountToAddressLedgerCallback = (message) => {
      if (LOG_LEDGER_POLLING) {
        mainConsole.log(`sendAmountToAddressLedgerCallback ${JSON.stringify(message)}`);
      }
      if (!message.success) {
        sendToAddressStatuses.length = 0;
        sendToAddressLinks.length = 0;
        sendToAddressStatuses.push(JSON.stringify(message));
        renderApp();
        return;
      }
      const signature = Buffer.from(message.signature, 'hex');
      const encodedTx = TxSigner.addSignatureToTx(tx, publicKey, signature);
      sendAmountToAddressCallback(encodedTx);
    }
    LedgerComm.sign(encodedUnsignedTx, sendAmountToAddressLedgerCallback);
  } else {
    const privateKeyElt = document.getElementById('privateKey');
    const privateKey = privateKeyElt.value;
    const encodedTx = TxFactory.createSignedSendToTx(privateKey, unspentTransactionOutputs, sendToAddress, sendAmount, feeAmountSats);

    if (encodedTx == undefined) {
      return;
    }
    sendAmountToAddressCallback(encodedTx);
  }
  renderApp();
}
// success: success,
// message: lastResponse,
// signature: signature

const sendAmountToAddressCallback = (encodedTx) => {
  const txUrl = getRpcUrl();

  const jsonString = `{"method":"sendrawtransaction", "params": ["${encodedTx}"]}`;

  mainConsole.log('sendAmountToAddress.encodedTx ' + JSON.stringify(encodedTx));

  const decodedTx = TxTranscoder.decodeTx(Buffer.from(encodedTx, 'hex'), true);

  mainConsole.log('sendAmountToAddress.decodedTx ' + JSON.stringify(decodedTx));

  sendToAddressStatuses.length = 0;
  sendToAddressLinks.length = 0;
  sendToAddressStatuses.push(JSON.stringify(encodedTx));
  sendToAddressStatuses.push(JSON.stringify(decodedTx));
  sendToAddressStatuses.push(`Transaction Requested: curl ${txUrl} -H "Content-Type: application/json" -d '${jsonString}'`);
  renderApp();
  postJson(txUrl, jsonString, sendAmountToAddressReadyCallback, sendAmountToAddressErrorCallback);
}

const requestListOfProducersErrorCallback = (response) => {
  producerListStatus = `Producers Error: ${JSON.stringify(response)}`;
  renderApp();
}

const requestListOfProducersReadyCallback = (response) => {
  producerListStatus = 'Producers Received';

  // mainConsole.log('STARTED Producers Callback', response);
  parsedProducerList = {};
  parsedProducerList.producersCandidateCount = 0;
  parsedProducerList.producers = [];
  if (response.error !== null) {
    producerListStatus = `Producers Error: ${JSON.stringify(response)}`;
  } else {
    parsedProducerList.totalvotes = response.result.totalvotes;
    parsedProducerList.totalcounts = response.result.totalcounts;
    response.result.producers.forEach((producer) => {
      const parsedProducer = {};
      // mainConsole.log('INTERIM Producers Callback', producer);
      parsedProducer.n = parsedProducerList.producers.length + 1;
      parsedProducer.nickname = producer.nickname;
      parsedProducer.active = producer.active.toString();
      parsedProducer.votes = producer.votes;
      parsedProducer.ownerpublickey = producer.ownerpublickey;
      parsedProducer.isCandidate = false;
      // mainConsole.log('INTERIM Producers Callback', parsedProducer);
      parsedProducerList.producers.push(parsedProducer);
    });
    // mainConsole.log('INTERIM Producers Callback', response.result.producers[0]);
  }
  // mainConsole.log('SUCCESS Producers Callback');

  renderApp();
}

const requestListOfProducers = () => {
  producerListStatus = 'Producers Requested';
  const txUrl = getRpcUrl();

  const jsonString = `{"method":"listproducers", "params": {"start": 0}}`;
  renderApp();
  postJson(txUrl, jsonString, requestListOfProducersReadyCallback, requestListOfProducersErrorCallback);
}

const toggleProducerSelection = (item) => {
  // mainConsole.log('INTERIM toggleProducerSelection item', item);
  const index = item.index;
  // mainConsole.log('INTERIM toggleProducerSelection index', index);
  // mainConsole.log('INTERIM toggleProducerSelection length', parsedProducerList.producers.length);
  const parsedProducer = parsedProducerList.producers[index];
  // mainConsole.log('INTERIM[1] toggleProducerSelection parsedProducer', parsedProducer);
  // mainConsole.log('INTERIM[1] toggleProducerSelection isCandidate', parsedProducer.isCandidate);
  parsedProducer.isCandidate = !parsedProducer.isCandidate;
  // mainConsole.log('INTERIM[2] toggleProducerSelection isCandidate', parsedProducer.isCandidate);

  parsedProducerList.producersCandidateCount = 0;
  parsedProducerList.producers.forEach((parsedProducerElt) => {
    if(parsedProducerElt.isCandidate) {
      parsedProducerList.producersCandidateCount++;
    }
  })

  renderApp();
}

const requestListOfCandidateVotesErrorCallback = (response) => {
  let displayRawError = true;
  if(response.error) {
    if(response.error.code == 45002) {
      displayRawError = false;
      candidateVoteListStatus = `Candidate Votes Error: ${response.message}`;
    }
  }
  if(displayRawError) {
    candidateVoteListStatus = `Candidate Votes Error: ${JSON.stringify(response)}`;
  }
  renderApp();
}

const requestListOfCandidateVotesReadyCallback = (response) => {
  candidateVoteListStatus = 'Candidate Votes Received';

  mainConsole.log('STARTED Candidate Votes Callback', response);
  parsedCandidateVoteList = {};
  parsedCandidateVoteList.candidateVotes = [];
  if (response.error !== null) {
    candidateVoteListStatus = `Candidate Votes Error: ${JSON.stringify(response)}`;
  } else {
    // response.result.producers.forEach((producer) => {
    //   const parsedProducer = {};
    //    mainConsole.log('INTERIM Producers Callback', producer);
    //   parsedProducer.n = parsedProducerList.producers.length + 1;
    //   parsedProducer.nickname = producer.nickname;
    //   parsedProducer.active = producer.active.toString();
    //   parsedProducer.votes = producer.votes;
    //   parsedProducer.ownerpublickey = producer.ownerpublickey;
    //   parsedProducer.isCandidate = false;
    //    mainConsole.log('INTERIM Producers Callback', parsedProducer);
    //   parsedProducerList.producers.push(parsedProducer);
    // });
    // mainConsole.log('INTERIM Producers Callback', response.result.producers[0]);
  }
  mainConsole.log('SUCCESS Candidate Votes Callback');

  renderApp();
}

const requestListOfCandidateVotes = () => {
  candidateVoteListStatus = 'Candidate Votes Requested';
  const txUrl = getRpcUrl();

  const jsonString = `{"method":"getutxosbyamount", "params": {"address":"${address}","utxotype":"vote","amount":"0.0000001"}}`;
  renderApp();
  postJson(txUrl, jsonString, requestListOfCandidateVotesReadyCallback, requestListOfCandidateVotesErrorCallback);
}

const sendVoteTx = () => {
  updateAmountAndFees();
  const unspentTransactionOutputs = parsedUnspentTransactionOutputs;
  mainConsole.log('sendVoteTx.unspentTransactionOutputs ' + JSON.stringify(unspentTransactionOutputs));

  if (Number.isNaN(feeAmountSats)) {
    throw new Error(`feeAmountSats ${feeAmountSats} is not a number`);
  }

  const candidates = [];
  parsedProducerList.producers.forEach((parsedProducer) => {
    if (parsedProducer.isCandidate) {
      candidates.push(parsedProducer.ownerpublickey);
    }
  })

  mainConsole.log('sendVoteTx.candidates ' + JSON.stringify(candidates));

  var encodedTx;

  mainConsole.log('sendVoteTx.useLedgerFlag ' + JSON.stringify(useLedgerFlag));
  mainConsole.log('sendVoteTx.unspentTransactionOutputs ' + JSON.stringify(unspentTransactionOutputs));
  candidateVoteListStatus = `Voting for ${parsedProducerList.producersCandidateCount} candidates.`;
  if (useLedgerFlag) {
    if(unspentTransactionOutputs) {
      const tx = TxFactory.createUnsignedVoteTx(unspentTransactionOutputs, publicKey, feeAmountSats, candidates);
      const encodedUnsignedTx = TxTranscoder.encodeTx(tx, false);
      const sendVoteLedgerCallback = (message) => {
        if (LOG_LEDGER_POLLING) {
          mainConsole.log(`sendVoteLedgerCallback ${JSON.stringify(message)}`);
        }
        if (!message.success) {
          // sendToAddressStatuses.length = 0;
          // sendToAddressLinks.length = 0;
          // sendToAddressStatuses.push(JSON.stringify(message));
          renderApp();
          return;
        }
        const signature = Buffer.from(message.signature, 'hex');
        const encodedTx = TxSigner.addSignatureToTx(tx, publicKey, signature);
        sendVoteCallback(encodedTx);
      }
      candidateVoteListStatus += ' please confirm tx on ledger.';
      LedgerComm.sign(encodedUnsignedTx, sendVoteLedgerCallback);
    } else {
      alert('please wait, UTXOs have not been retrieved yet.');
    }
  } else {
    const privateKeyElt = document.getElementById('privateKey');
    const privateKey = privateKeyElt.value;
    const encodedTx = TxFactory.createSignedVoteTx(privateKey, unspentTransactionOutputs, feeAmountSats, candidates);

    mainConsole.log('sendVoteTx.encodedTx ' + JSON.stringify(encodedTx));

    if (encodedTx == undefined) {
      return;
    }
    sendVoteCallback(encodedTx);
  }
  renderApp();
}
// success: success,
// message: lastResponse,
// signature: signature

const sendVoteCallback = (encodedTx) => {
  const txUrl = getRpcUrl();

  const jsonString = `{"method":"sendrawtransaction", "params": ["${encodedTx}"]}`;

  mainConsole.log('sendVoteCallback.encodedTx ' + JSON.stringify(encodedTx));

  const decodedTx = TxTranscoder.decodeTx(Buffer.from(encodedTx, 'hex'), true);

  mainConsole.log('sendVoteCallback.decodedTx ' + JSON.stringify(decodedTx));

  // sendToAddressStatuses.length = 0;
  // sendToAddressLinks.length = 0;
  // sendToAddressStatuses.push(JSON.stringify(encodedTx));
  // sendToAddressStatuses.push(JSON.stringify(decodedTx));
  // sendToAddressStatuses.push(`Transaction Requested: curl ${txUrl} -H "Content-Type: application/json" -d '${jsonString}'`);
  renderApp();
  postJson(txUrl, jsonString, sendVoteReadyCallback, senVoteErrorCallback);
}

const senVoteErrorCallback = (error) => {
  mainConsole.log('senVoteErrorCallback ' + JSON.stringify(error));
  // sendToAddressStatuses.push(JSON.stringify(error));
  renderApp();
}

const sendVoteReadyCallback = (transactionJson) => {
  mainConsole.log('sendVoteReadyCallback ' + JSON.stringify(transactionJson));
  if (transactionJson.error) {
    candidateVoteListStatus = `Vote Error: ${transactionJson.error.message}`;
  } else {
    candidateVoteListStatus = `Vote Success TX: ${transactionJson.result}`;
  }
  renderApp();
}

const getTransactionHistoryErrorCallback = (response) => {
  transactionHistoryStatus = `History Error: ${JSON.stringify(response)}`;
  renderApp();
}

const getTransactionHistoryReadyCallback = (transactionHistory) => {
  transactionHistoryStatus = 'History Received';
  parsedTransactionHistory.length = 0;
  transactionHistory.txs.forEach((tx, txIx) => {
    const time = formatDate(new Date(tx.time * 1000));
    // tx.vin.forEach((vinElt) => {
    //   const parsedTransaction = {};
    //   parsedTransaction.n = txIx;
    //   parsedTransaction.type = 'input';
    //   parsedTransaction.value = vinElt.value;
    //   parsedTransaction.valueSat = vinElt.valueSat;
    //   parsedTransaction.address = vinElt.addr;
    //   parsedTransaction.txHash = tx.txid;
    //   parsedTransaction.txDetailsUrl = getTransactionHistoryLink(tx.txid);
    //   parsedTransaction.time = time;
    //   parsedTransactionHistory.push(parsedTransaction);
    // });
    tx.vout.forEach((voutElt) => {
      voutElt.scriptPubKey.addresses.forEach((voutAddress) => {
        const parsedTransaction = {};
        parsedTransaction.n = txIx;
        if(voutAddress == address) {
          parsedTransaction.type = 'input';
        } else {
          parsedTransaction.type = 'output';
        }
        parsedTransaction.value = voutElt.value;
        parsedTransaction.valueSat = voutElt.valueSat;
        parsedTransaction.address = voutAddress;
        parsedTransaction.txHash = tx.txid;
        parsedTransaction.txDetailsUrl = getTransactionHistoryLink(tx.txid);
        parsedTransaction.time = time;
        parsedTransactionHistory.push(parsedTransaction);
      });
    });
  });

  renderApp();
}

const requestTransactionHistory = () => {
  transactionHistoryStatus = 'History Requested';
  const transactionHistoryUrl = getTransactionHistoryUrl(address);
  //mainConsole.log('requestTransactionHistory ' + transactionHistoryUrl);
  getJson(transactionHistoryUrl, getTransactionHistoryReadyCallback, getTransactionHistoryErrorCallback);
};

const getBalanceErrorCallback = (response) => {
  balanceStatus = `Balance Error:${JSON.stringify(response)} `;
}

const getBalanceReadyCallback = (balanceResponse) => {
  balanceStatus = `Balance Received:${balanceResponse.Desc} ${balanceResponse.Error} `;
  balance = balanceResponse.Result;

  renderApp();
}

const requestBalance = () => {
  const balanceUrl = getBalanceUrl(address);
  balanceStatus = `Balance Requested ${balanceUrl}`;
  getJson(balanceUrl, getBalanceReadyCallback, getBalanceErrorCallback);
};

const getBlockchainStateErrorCallback = (response) => {
  balanceStatus = `Blockchain State Error:${JSON.stringify(response)} `;
}

const getBlockchainStateReadyCallback = (blockchainStateResponse) => {
  blockchainStatus = `Blockchain State Received:${blockchainStateResponse.Desc} ${blockchainStateResponse.Error} `;
  blockchainState = blockchainStateResponse.Result;

  renderApp();
}

const requestBlockchainState = () => {
  const stateUrl = getStateUrl();
  blockchainState = {};
  blockchainStatus = `Blockchain State Requested ${stateUrl}`;
  getJson(stateUrl, getBlockchainStateReadyCallback, getBlockchainStateErrorCallback);
};

const getConfirmations = () => {
  if(blockchainState.height) {
    return blockchainState.height - blockchainLastActionHeight;
  } else {
    return 0;
  }
}

const setBlockchainLastActionHeight = () => {
  if(blockchainState.height) {
    blockchainLastActionHeight = blockchainState.height;
  }
}

const removeClass = (id, cl) => {
  get(id).classList.remove(cl);
}

const addClass = (id, cl) => {
  get(id).classList.add(cl);
}

const selectButton = (id) => {
  addClass(id, 'white_on_light_purple');
  removeClass(id, 'white_on_purple_with_hover');
}

const clearButtonSelection = (id) => {
  removeClass(id, 'white_on_light_purple');
  addClass(id, 'white_on_purple_with_hover');
}

const hideEverything = () => {
  clearButtonSelection('send');
  clearButtonSelection('home');
  clearButtonSelection('receive');
  clearButtonSelection('transactions');
  clearButtonSelection('voting');
  hide('private-key-entry');
  hide('cancel-confirm-transaction');
  hide('completed-transaction');
  hide('fees');
  hide('confirm-and-see-fees');
  hide('to-address');
  hide('send-amount');
  hide('from-address');
  hide('balance');
  hide('transaction-more-info');
  hide('transaction-list-small');
  hide('transaction-list-large');
  hide('your-address');
  hide('private-key-login');
  hide('ledger-login');
  hide('send-spacer-01');
  hide('private-key-generate');
  hide('private-key-generator');
  hide('candidate-list');
  hide('candidate-vote-button');
  hide('candidate-vote-list');
}

const openDevTools = () => {
  try {
    const window = remote.getCurrentWindow();
    window.webContents.openDevTools();
  } catch (e) {
    alert(`error:${e}`)
  }
}

const copyToClipboard = () => {
  clipboard.writeText(generatedPrivateKeyHex);
  alert(`copied to clipboard:\n${generatedPrivateKeyHex}`)
}

const showLogin = () => {
  clearGlobalData();
  hideEverything();
  clearSendData();
  show('private-key-login');
  show('ledger-login');
  show('private-key-generate');
}

const showHome = () => {
  if (!isLoggedIn) {
    return;
  }
  hideEverything();
  clearSendData();
  show('transaction-more-info');
  show('transaction-list-small');
  show('your-address');
  selectButton('home');
}

const showSend = () => {
  if (!isLoggedIn) {
    return;
  }
  hideEverything();
  clearSendData();
  show('from-address');
  show('balance');
  show('send-amount');
  show('to-address');
  show('confirm-and-see-fees');
  selectButton('send');
}

const cancelSend = () => {
  const sendToAddressElt = document.getElementById('sendToAddress');
  const sendAmountElt = document.getElementById('sendAmount');
  const feeAmountElt = document.getElementById('feeAmount');

  sendToAddressElt.value = '';
  sendAmountElt.value = '';
  feeAmountElt.value = DEFAULT_FEE_SATS;

  sendAmount = '';
  feeAmountSats = '';
  feeAmountEla = '';

  showSend();
}

const showConfirmAndSeeFees = () => {
  hideEverything();
  show('fees');
  show('cancel-confirm-transaction');
  show('send-spacer-01');
  selectButton('send');
  updateAmountAndFeesAndRenderApp();
}

const showCompletedTransaction = () => {
  hideEverything();
  show('fees');
  show('completed-transaction');
  show('send-spacer-01');
  selectButton('send');
  updateAmountAndFeesAndRenderApp();
}

const showReceive = () => {
  if (!isLoggedIn) {
    return;
  }
  hideEverything();
  clearSendData();
  show('your-address');
  selectButton('receive');
}

const showTransactions = () => {
  if (!isLoggedIn) {
    return;
  }
  hideEverything();
  clearSendData();
  show('transaction-more-info');
  show('transaction-list-large');
  selectButton('transactions');
}

const showVoting = () => {
  if (!isLoggedIn) {
    return;
  }
  hideEverything();
  clearSendData();
  requestListOfProducers();
  requestListOfCandidateVotes();
  show('candidate-list');
  show('candidate-vote-button');
  show('candidate-vote-list');
  selectButton('voting');
}

const showPrivateKeyEntry = () => {
  hideEverything();
  clearSendData();
  show('private-key-entry');
}

const showGenerateNewPrivateKey = () => {
  hideEverything();
  clearSendData();
  show('private-key-generator');
  generatedPrivateKeyHex = crypto.randomBytes(32).toString('hex');
  renderApp();
}

const clearGlobalData = () => {
  get('privateKey').value = '';
  get('feeAmount').value = DEFAULT_FEE_SATS;

  useLedgerFlag = false;
  publicKey = undefined;
  address = undefined;
  balance = undefined;
  generatedPrivateKeyHex = undefined;

  sendAmount = '';
  feeAmountSats = '';
  feeAmountEla = '';

  sendToAddressStatuses.length = 0;
  sendToAddressLinks.length = 0;
  sendToAddressStatuses.push('No Send-To Transaction Requested Yet');

  balanceStatus = 'No Balance Requested Yet';

  transactionHistoryStatus = 'No History Requested Yet';
  parsedTransactionHistory.length = 0;

  unspentTransactionOutputsStatus = 'No UTXOs Requested Yet';
  parsedUnspentTransactionOutputs.length = 0;
  renderApp();
}

const Version = () => {
  return remote.app.getVersion();
}

const LedgerMessage = () => {
  let message = '';
  if (LOG_LEDGER_POLLING) {
    mainConsole.log('LedgerMessage', ledgerDeviceInfo);
  }
  if (ledgerDeviceInfo) {
    if (ledgerDeviceInfo.error) {
      message += 'Error:';
      if (ledgerDeviceInfo.message) {
        message += ledgerDeviceInfo.message;
      }
    } else {
      if (ledgerDeviceInfo.message) {
        message += ledgerDeviceInfo.message;
      }
    }
  }
  return message;
}

const UseLedgerButton = () => {
  if (
    ledgerDeviceInfo
    ? ledgerDeviceInfo.enabled
    : false) {
    return (<div className="white_on_gray bordered display_inline_block float_right fake_button rounded padding_5px" onClick={(e) => getPublicKeyFromLedger()}>Use Ledger</div>);
  } else {
    return (<div className="white_on_pink bordered display_inline_block float_right fake_button rounded padding_5px">Use Ledger</div>);
  }
  return (<div/>);
}

const TransactionHistoryElementIcon = (props) => {
  const item = props.item;
  if (item.type == 'input') {
    return (<img src="artwork/received-ela.svg"/>);
  }
  if (item.type == 'output') {
    return (<img src="artwork/sent-ela.svg"/>);
  }
  return (<div/>);
}

const ProducerSelectionButtonText = (props) => {
  // mainConsole.log('INTERIM ProducerSelectionButtonText props', props);
  // mainConsole.log('INTERIM ProducerSelectionButtonText item', props.item);
  // mainConsole.log('INTERIM ProducerSelectionButtonText isCandidate', props.item.isCandidate);
  const item = props.item;
  const isCandidate = item.isCandidate;
  if (isCandidate) {
    return ('Yes')
  } else {
    return ('No')
  }
}

const onLinkClick = (event, href) => {
  event.preventDefault();
  shell.openExternal(href);
}

const Elastos = () => {
  return (
    <div className="white_link_with_hover fake_button h40px" onClick={(e) => onLinkClick(e, 'https://elastos.org')}>Elastos <Version/></div>
  )
}

const DownloadApp = () => {
  return (
    <div id='refresh' className="white_link_with_hover fake_button h40px" onClick={(e) => onLinkClick(e, 'https://github.com/coranos/elastos-light-wallet/releases/latest')}>Download App</div>
  )
}

const Refresh = () => {
  return (
    <div id='refresh' className="white_link_with_hover fake_button h40px" onClick={(e) => refreshBlockchainData()}>
      Refresh</div>
  )
}

const ShowDevTools = () => {
  return (
    <div className="white_link fake_button h40px" onClick={(e) => openDevTools()}>Dev Tools</div>
  )
}

const Balance = () => {
  return (
    <div className="white_link border_radius30px margin20px h100px gray_bg41_fg5A">Balance <p>{balance}</p></div>
  )
}

const Votes = () => {
  return (
    <div className="white_link border_radius30px margin20px h100px gray_bg41_fg5A">
    Votes
    <br/>
    <div>Producer List Status</div>
    <br/> {producerListStatus}
    <br/>
    <div>
      <span className="padding_2px">{parsedProducerList.totalvotes}</span>
      Votes</div>
    <div>
      <span className="padding_2px">{parsedProducerList.totalcounts}</span>
      Counts</div>
    <div>
      <span className="padding_2px">{parsedProducerList.producersCandidateCount}</span>
      Selected Candidates</div>
    <div>
      Candidates (
      <span className="padding_2px">{parsedProducerList.producers.length}</span>
      total)</div>
    </div>
  )
}

const Send = () => {
  return (
    <div className="white_link border_radius30px margin20px h100px">Send</div>
  )
}

const Recieve = () => {
  return (
    <div className="white_link border_radius30px margin20px h100px">Recieve</div>
  )
}

const Transactions = () => {
  return (
    <div className="white_link border_radius30px margin20px h100px">Transactions</div>
  )
}

class App extends React.Component {
  render() {
    return (<div>
      <table className="w800h600px no_padding no_border">
        <tbody>
          <tr className="no_padding h40px">
            <td className="no_padding">
            <table className="no_padding no_border w100pct gray_bg28_fg5A">
              <tbody>
              <tr className="no_padding h40px">
                <td className="valign_top no_border w60pct">
                  <Elastos />
                </td>
                <td className="valign_top no_border w20pct">
                  <DownloadApp />
                </td>
                <td className="valign_top no_border w10pct">
                  <Refresh />
                </td>
                <td className="valign_top no_border w10pct">
                  <ShowDevTools />
                </td>
              </tr>
              </tbody>
            </table>
            </td>
          </tr>
          <tr className="no_padding h100px">
            <td className="no_padding">
            <table className="no_padding no_border w100pct lower_border_radius30px gray_bg28_fg5A">
              <tbody>
                <tr className="no_padding h100px">
                  <td className="valign_top no_border w40pct">
                    <Balance />
                  </td>
                  <td className="valign_top no_border w40pct">
                    <Votes />
                  </td>
                  <td className="valign_top no_border w20pct">
                  </td>
                </tr>
              </tbody>
            </table>
            </td>
          </tr>
          <tr className="no_padding h200px">
            <td className="no_padding">
            <table className="no_padding no_border w100pct">
              <tbody>
                <tr className="no_padding h100px">
                  <td className="valign_top no_border w30pct">
                    <Send />
                  </td>
                  <td className="valign_top no_border w30pct">
                    <Recieve />
                  </td>
                  <td className="valign_top no_border w40pct">
                    <Transactions />
                  </td>
                </tr>
              </tbody>
            </table>
            </td>
          </tr>
          <tr className="no_padding">
         </tr>
        </tbody>
      </table>
    </div>)
  }
}
const renderApp = () => {
  ReactDOM.render(<App/>, document.getElementById('main'));
};
const onLoad = () => {
  showLogin();
}

/** call initialization functions */
window.onload = onLoad;

setPollForAllInfoTimer();

renderApp();
