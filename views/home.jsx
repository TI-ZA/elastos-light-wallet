const React = require('react');

const QRCode = require('qrcode.react');

const Menu = require('./partial/menu.jsx');

const Banner = require('./partial/banner.jsx');

const Branding = require('./partial/branding.jsx');

const Balance = require('./partial/balance.jsx');

const News = require('./partial/news.jsx');

const Staking = require('./partial/staking.jsx');

const SocialMedia = require('./partial/social-media.jsx');

let consolidesCount = 0;
let showPasswordModal = false;
let showPasswordToggle = false;
let sendTxType = false;
let consolidateTxType = false;
let isSent = false;

module.exports = (props) => {
  const App = props.App;
  const openDevTools = props.openDevTools;
  const Version = props.Version;
  const GuiToggles = props.GuiToggles;
  const onLinkClick = props.onLinkClick;
  const isLedgerConnected = App.isLedgerConnected();
  consolidesCount = Math.ceil(Number(App.getTotalUTXOs())/Number(App.getMaxUTXOsPerTX()));
  let consolidateTitle = "Total number of UTXOs is "+App.getTotalUTXOs()+". You can consolidate UTXOs up to "+consolidesCount+" times.";
  
  const showMenu = () => {
    GuiToggles.showMenu('home');
  }

  const sendIsFocus = () => {
    App.setSendHasFocus(true);
  }

  const sendIsNotFocus = () => {
    App.setSendHasFocus(false);
    // App.checkTransactionHistory();
  }

  const showConfirmAndSeeFees = () => {
    // App.log('STARTED showConfirmAndSeeFees')
    App.setSendHasFocus(false);
    const isValid = App.validateInputs();
    if (isValid) {
      App.setSendStep(2);
    }
    App.renderApp();
  }

  const cancelSend = () => {
    App.setSendStep(1);
    //App.clearSendData();
    App.setSendHasFocus(false);
    App.renderApp();
  }

  const sendAmountToAddress = () => {
    App.setSendHasFocus(false);
    let isSent = App.sendAmountToAddress();
    if (isSent) {
      showPasswordModal = false;
    }
    App.renderApp();
  }
  
  const consolidateUTXOs = () => {
    App.setSendHasFocus(false);
    isSent = App.consolidateUTXOs();
    if (isSent) {
      showPasswordModal = false;
    }
    App.renderApp();
  }

  const SendScreen = (props) => {
    // App.log('SendScreen', App.getSendStep());
    if (App.getSendStep() == 1) {
      return (<div>
        <SendScreenOne visibility=""/>
        <SendScreenTwo visibility="display_none"/>
      </div>)
    }
    if (App.getSendStep() == 2) {
      return (<div>
        <SendScreenOne visibility="display_none"/>
        <SendScreenTwo visibility=""/>
      </div>)
    }
  }
  
  const showSendModal = () => {
    App.setSendHasFocus(false);
    showPasswordModal = true;
    sendTxType = true;
    consolidateTxType = false;
    App.renderApp();
    //console.log("showSendModal");
  }
  
  const showConsolidateModal = () => {
    App.setSendHasFocus(false);
    showPasswordModal = true;
    sendTxType = false;
    consolidateTxType = true;
    App.renderApp();
  }
  
  const closeModal = () => {
    showPasswordModal = false;
    App.renderApp();    
  }
  
  const showPassword = () => {
    if (showPasswordToggle) {
      showPasswordToggle = false;
    } else {
      showPasswordToggle = true;
    }
    App.renderApp();    
  }
  
  const loadMoreTx = () => {
    var txRecordCount = App.getTxRecordsCount()+App.getInitTxRecordsCount();
    App.setTxRecordsCount(txRecordCount);
    App.renderApp();
  }  
  
  const SendScreenOne = (props) => {
    const visibility = props.visibility;
    return (<div id="sendOne" className={`send-area ${visibility}`}>
      <img src="artwork/sendicon.svg" className="send-icon"/>
      <p className="send-text">Send</p>
      <input type="text" size="34" maxLength={34} id="sendToAddress" className="ela-address_input" placeholder="Enter ELA Address" defaultValue={App.getSendToAddress()} onFocus={(e) => sendIsFocus(e)} /*onBlur={(e) => sendIsNotFocus(e)}*//>
      <input type="text" size="14" maxLength={14} id="sendAmount" className="ela-send_amount" placeholder="Amount" defaultValue={App.getSendAmount()} onFocus={(e) => sendIsFocus(e)} /*onBlur={(e) => sendIsNotFocus(e)}*//>    
    <div className="quick-elaselector">
      <button className="quick-elaselector-icon quarter" onClick={() => App.insertELA('quarter')}>25%</button>
      <button className="quick-elaselector-icon half" onClick={() => App.insertELA('half')}>50%</button>
      <button className="quick-elaselector-icon max" onClick={() => App.insertELA('max')}>Max</button>
    </div>
    <hr className="ela-send_amount_line" />
    <p className="elatext-send">ELA</p>
    <input type="text" size="5" maxLength={5} id="feeAmount" placeholder="Fees" defaultValue={App.getFee()} onFocus={(e) => sendIsFocus(e)} /*onBlur={(e) => sendIsNotFocus(e)}*/></input>
    <div className="fees-text">Fees (in Satoshi ELA)</div>
      <button className="next-button scale-hover" onClick={(e) => showConfirmAndSeeFees()}><p>Next</p></button>
      <button style={App.showConsolidateButton() ? {display: 'block'} : {display: 'none'}} className="consolidate-button dark-hover cursor_def" title={consolidateTitle} onClick={(App.getPasswordFlag()) ? (e) => showConsolidateModal() : (e) => consolidateUTXOs()}>Consolidate ({consolidesCount})<img src="artwork/arrow.svg" alt="" className="arrow-forward"/></button>
    </div>);
  }

  const SendScreenTwo = (props) => {
    const visibility = props.visibility;
    return (
      <div id="sendTwo" className={`send-area ${visibility}`}>
        <img src="artwork/sendicon.svg" className="send-icon" title="Refresh Blockchain Data"  onClick={(e) => App.refreshBlockchainData()}/>
        <p className="send-text">Send</p>
        <p className="confirm-send-address-label">Receiving Address</p>
        <p className="confirm-send address"><span>{App.getSendToAddress()}</span></p>        
        <p className="confirm-send total">Total spending amount with fees is <span>{App.getTotalSpendingELA()} ELA</span></p>
        <button className="send-back dark-hover cursor_def" onClick={(e) => cancelSend()}><img src="artwork/arrow.svg" alt="" className="rotate_180 arrow-back" /><span className="send-back-text">Back</span></button>        
        <button className="sendela-button scale-hover" onClick={(App.getPasswordFlag()) ? (e) => showSendModal() : (e) => sendAmountToAddress()}><p>Send ELA</p></button>        
      </div>
    )
  }

  return (<div id="home" className="gridback w780h520px">
    <Banner App={App} GuiToggles={GuiToggles} page="home"/>
    <Menu App={App} openDevTools={openDevTools} GuiToggles={GuiToggles} page="home"/> {/* <div id="homeMenuOpen" className="h25px bordered display_inline_block bgcolor_black_hover" title="menu" onClick={(e) => showHomeMenu()}>
       <img src="artwork/more-vertical.svg" />
     </div> */
    }
    <div id="version" className="display_inline_block hidden">
      <Version/>
    </div>
    <div className="logo-info">
      <Branding/>
      <header>
        <img src="artwork/refreshicon.svg" className="refresh-icon" title="Refresh" onClick={(e) => App.refreshBlockchainData()} />
        <nav id="homeMenuOpen" title="Menu" onClick={(e) => showMenu()}>
          <img src="artwork/nav.svg" className="nav-icon dark-hover" onClick={(e) => showMenu()}/>
        </nav>
      </header>
      <div className="pricearea">
        <Balance App={App}/>
      </div>

      <div className="stakingarea">
        <Staking App={App} GuiToggles={GuiToggles}/>
      </div>

      <div id="scroll-radio"></div>

      <div>
        <News App={App} onLinkClick={onLinkClick}/>
      </div>

    </div>

    <div className="send-area">
      <SendScreen/>

    </div>

    <div className="receive-area">
      <img src="artwork/sendicon.svg" className="rec-icon"/>
      <p className="rec-text">Receive</p>
      <p className="address-text address-position">Address</p>
      <button className="copy-button scale-hover" onClick={(e) => App.copyAddressToClipboard()}>
        <img src="artwork/copycut.svg" className="copy-icon" height="20px" width="20px"/>
      </button>
      <p className="address-ex word-breakall">{App.getAddress()}</p>
      {/* <img id="qricon" src="artwork/qricon.svg" className="qr-icon" height="54px" width="54px" /> */}
      <button className="qr-icon btn_none br5" title="Click to enlarge" onClick={(e) => GuiToggles.showQRCode()}>
        <QRCode value={App.getAddressOrBlank()} size={78} includeMargin={true} className="scale-hover"/>
      </button>
      <p className="scanqr-text">Scan
        <strong> QR code </strong>
        to get
        <br/>ELA Address</p>
      <p className="howqr-text gradient-font">Click QR code to Enlarge</p>
      <img src="artwork/separator.svg" className="rec-separator"/>
      <p className="ledger-heading">Ledger</p>
      {isLedgerConnected && <img src="artwork/ledgericon.svg" alt="" className="ledger-icon scale-hover" height="36px" width="57px" title="Please verify above address on Ledger" onClick={(e) => App.verifyLedgerBanner()}/>}
      {isLedgerConnected && <p className="verifyledger-text">Please verify above address<br/><strong>on Ledger Device</strong></p>}
      {!isLedgerConnected && <img src="artwork/ledgericon.svg" alt="" className="ledger-icon scale-hover" height="36px" width="57px" title="No Ledger device connected"/>}
      {!isLedgerConnected && <p className="verifyledger-text">No Ledger device<br/><strong>connected</strong></p>}
    </div>

    <div className="transaction-area">
      <p className="transactions-heading">Transactions</p>
      <p className="blockcount transactionstatus">
        <span>Status:</span>
        <span>{App.getTransactionHistoryStatus()}</span>
      </p>
      <p className="blockcount">
        <span>Blocks:</span>
        <span>{App.getBlockchainState().height}</span>
      </p>

      <div className="txtablediv scrollbar">

        <table className="txtable">
          <tbody>
            <tr className="txtable-headrow">
              <td>VALUE</td>
              <td>DATE</td>
              <td>TYPE</td>
              <td>TX</td>
              <td>MEMO</td>
            </tr>

            {
              App.getParsedTransactionHistory().slice(0, App.getTxRecordsCount()).map((item, index) => {
                return (<tr className="txtable-row" key={index}>
                  <td title={item.value}>{item.valueShort}&nbsp;<span className="dark-font">ELA</span>
                  </td>
                  <td>{item.date}&nbsp;&nbsp;<span className="dark-font">{item.time}</span>
                  </td>
                  <td className={(item.status === "pending") ? "tx-pending" : "" }>{item.type}</td>
                  <td>
                    <a className="exit_link" href={item.txDetailsUrl} onClick={(e) => onLinkClick(e)}>{item.txHashWithEllipsis}</a>
                  </td>
                  <td>
                    <span title={item.memoLong} className="tx-memo">{item.memo}</span>
                  </td>
                </tr>)
              })
            }

          </tbody>
        </table>
        <div className="flex-middle" style={(App.getParsedTransactionHistory().length > App.getInitTxRecordsCount()) ? {display: 'flex'} : {display: 'none'}}>
          <button className="history-button dark-hover m10B" onClick={(e) => loadMoreTx()}><img src="artwork/arrow.svg" alt="" className="rotate_90 arrow-history"/></button>
        </div>
      </div>

      <div>
        <SocialMedia GuiToggles={GuiToggles} onLinkClick={onLinkClick}/>
      </div>

    </div>
    <div className="bg-modal w400px h200px" style={showPasswordModal ? {display: 'flex'} : {display: 'none'}}>
      <div className="modalContent w350px h180px">
        <div className="closeModal" onClick={(e) => closeModal()}>
          <img className="scale-hover" src="artwork/voting-back.svg" height="38px" width="38px"/>
        </div>
        <div>
          <span className="address-text modal-title font_size20 gradient-font">Enter password</span>
        </div>
        <div className="m15T">
          <input type="password" className="enterPassword" type={showPasswordToggle ? "text" : "password"} size="18" id="sendPassword" placeholder="Enter Password" name="sendPassword"/>
          <img className={showPasswordToggle ? "passwordIcon passwordHide" : "passwordIcon passwordShow"} onClick={(e) => showPassword()} />
        </div>
        <div className="m15T">
          <button className="submitModal scale-hover" onClick={sendTxType ? (e) => sendAmountToAddress() : (e) => consolidateUTXOs()}>Confirm</button>
        </div>
      </div>
    </div>

  </div>)
};
