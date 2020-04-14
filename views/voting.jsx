const React = require('react');

const Menu = require('./partial/menu.jsx');

const Branding = require('./partial/branding.jsx');

const Balance = require('./partial/balance.jsx');

const News = require('./partial/news.jsx');

const Staking = require('./partial/staking.jsx');

const SocialMedia = require('./partial/social-media.jsx');

module.exports = (props) => {
  const App = props.App;
  const openDevTools = props.openDevTools;
  const Version = props.Version;
  const GuiToggles = props.GuiToggles;

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

  return (
    <table id="voting" className="bordered w750h520px">
      <tbody>
        <tr>
          <td className="bordered w250px h200px ta_center va_top">
            <Branding />
            <Balance App={App}/>
          </td>
          <td colSpan="2" className="bordered w400px h200px ta_center va_top">
            <div className="bordered padding_5px bgcolor_black_hover" onClick={(e) => GuiToggles.showHome()}>Home</div>
            <div className="gray_on_white">Producer List Status</div>
            <br/> {App.getProducerListStatus()}
            <br/>
            <div className="gray_on_white float_right display_inline_block">
              <span className="padding_2px">{App.getParsedProducerList().totalvotes}</span>
              Votes</div>
            <div className="gray_on_white float_right display_inline_block">
              <span className="padding_2px">{App.getParsedProducerList().totalcounts}</span>
              Counts</div>
            <div className="gray_on_white float_right display_inline_block">
              <span className="padding_2px">{App.getParsedProducerList().producersCandidateCount}</span>
              Selected Candidates</div>
            <div className="gray_on_white display_inline_block">
              Candidates (
              <span className="padding_2px">{App.getParsedProducerList().producers.length}</span>
              total)</div>
            <p></p>
            <div className="h200px overflow_auto">
              <table className="w100pct no_border whitespace_nowrap font_size12">
                <tbody>
                  <tr>
                    <td className="no_border no_padding">N</td>
                    <td className="no_border no_padding">Nickname</td>
                    <td className="no_border no_padding">Active</td>
                    <td className="no_border no_padding">Votes</td>
                    <td className="no_border no_padding">Select</td>
                  </tr>
                  {
                    App.getParsedProducerList().producers.map((item, index) => {
                      return (<tr key={index}>
                        <td className="no_border no_padding">{item.n}</td>
                        <td className="no_border no_padding">{item.nickname}</td>
                        <td className="no_border no_padding">{item.active}</td>
                        <td className="no_border no_padding">{item.votes}</td>
                        <td className="white_on_purple_with_hover h20px fake_button" onClick={(e) => App.toggleProducerSelection({index})}>
                          <ProducerSelectionButtonText item={item}/>
                        </td>
                      </tr>)
                    })
                  }
                </tbody>
              </table>
            </div>
            <div className="bordered padding_5px bgcolor_black_hover" onClick={(e) => App.sendVoteTx()}>Send Votes</div>
          </td>
        </tr>
        <tr>
          <td className="bordered w250px h200px ta_center va_top">
            <Staking App={App} GuiToggles={GuiToggles}/>
            <News/>
            <SocialMedia GuiToggles={GuiToggles}/>
          </td>
          <td colSpan="2" className="bordered w400px h200px ta_center va_top">
          <div className="gray_on_white">Candidate List Status</div>
            <br/> {App.getCandidateVoteListStatus()}
            <br/>
            <div className="gray_on_white ` display_inline_block">
              Candidate Votes (
              <span>{App.getParsedCandidateVoteList().candidateVotes.length}</span>
              total)</div>
            <p></p>
            <div className="h200px overflow_auto">
              <table className="w100pct black_on_offwhite no_border whitespace_nowrap">
                <tbody>
                  <tr>
                    <td className="no_border no_padding">N</td>
                    <td className="no_border no_padding">Nickname</td>
                    <td className="no_border no_padding">Votes</td>
                  </tr>
                  {
                    App.getParsedCandidateVoteList().candidateVotes.map((item, index) => {
                      return (<tr key={index}>
                        <td className="no_border no_padding">{item.n}</td>
                        <td className="no_border no_padding">{item.nickname}</td>
                        <td className="no_border no_padding">{item.votes}</td>
                      </tr>)
                    })
                  }
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  );
}