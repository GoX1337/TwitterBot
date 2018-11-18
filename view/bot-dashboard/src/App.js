import React, { Component } from 'react';
import './App.css';

import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import FormControl from '@material-ui/core/FormControl';
import Snackbar from '@material-ui/core/Snackbar';
import AppBar from '@material-ui/core/AppBar';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Switch from '@material-ui/core/Switch';

class App extends Component {

  constructor(props) {
    super(props);
    this.state = {
      config: {},
      stats: {},
      open: false,
      vertical: 'top',
      horizontal: 'center',
      value: 0
    };
    this.state.config.concoursInterval = '';
    this.state.config.pause = '';
    this.state.config.nbConcoursTweetsPerInterval = '';
    this.state.config.nbRandomTweetsPerInterval = '';
    this.state.config.concours = false;
    this.state.config.stream = false;
    this.state.message = '';
    this.state.stats.concoursRT = '';
    this.state.stats.randomRT = '';
  }

  componentDidMount() {
    fetch('/bot/config')
      .then(response => response.json())
      .then(data => {
        this.setState({ config: data });
        console.log(this.state.config);
      });

    fetch('/bot/stats')
      .then(response => response.json())
      .then(data => {
        if (data) {
          let sts = {};
          data.forEach(e => {
            if(e.id === "concoursRT")
              sts.concoursRT = e.value + " since " + e.date;
            else if(e.id === "randomRT")
              sts.randomRT = e.value + " since " + e.date;
          });
          this.setState({ stats: sts });
          console.log(this.state.stats);
        }
      });
  }

  handleChange(e) {
    console.log("handleChange: " + e.target.name + " " + e.target.value);
    let cfg = this.state.config;
    cfg[e.target.name] = e.target.value;
    this.setState({ config: cfg });
  }

  handleChangeSwitch(e) {
    console.log("handleChange: " + e.target.name + " " + e.target.checked);
    let cfg = this.state.config;
    cfg[e.target.name] = e.target.checked;
    this.setState({ config: cfg });
  }

  handleChangeTab = (event, value) => {
    this.setState({ value });
  };

  updateButton() {
    console.log('Update ' + JSON.stringify(this.state.config));
    fetch('/bot/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        "concoursInterval": this.state.config.concoursInterval,
        "pause": this.state.config.pause,
        "nbConcoursTweetsPerInterval": this.state.config.nbConcoursTweetsPerInterval,
        "nbRandomTweetsPerInterval": this.state.config.nbRandomTweetsPerInterval,
        "stream": this.state.config.stream,
        "concours": this.state.config.concours
      })
    }).then((res) => res.json())
      .then((data) => {
        this.setState({ message: data.msg }, () => {
          this.setState({ open: true }, () => {
            setTimeout(() => this.setState({ open: false }), 1500);
          });
        });
      })
      .catch((err) => console.log(err));
  }

  handleClose = () => {
    this.setState({ open: false });
  };

  render() {
    const { vertical, horizontal, open, value } = this.state;
    return (
      <div className="App">

        <AppBar position="static">
          <Tabs value={value} onChange={this.handleChangeTab}>
            <Tab label="Config" />
            <Tab label="Stats" />
          </Tabs>
        </AppBar>
        {value === 0 &&
          <FormControl component="fieldset">
            <FormControlLabel
              control={
                <Switch
                  checked={this.state.config.stream}
                  onChange={this.handleChangeSwitch.bind(this)}
                  value="stream"
                  name="stream"
                  color="primary"
                />
              }
              label="Stream started"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={this.state.config.concours}
                  onChange={this.handleChangeSwitch.bind(this)}
                  value="concours"
                  name="concours"
                  color="primary"
                />
              }
              label="Concours started"
            />
            <TextField id="concoursInterval" name="concoursInterval" label="Concours interval (min)" margin="normal" value={this.state.config.concoursInterval} onChange={this.handleChange.bind(this)} />
            <TextField id="pause" name="pause" label="Pause (min)" margin="normal" value={this.state.config.pause} onChange={this.handleChange.bind(this)} />
            <TextField id="nbConcoursTweetsPerInterval" name="nbConcoursTweetsPerInterval" label="Nb concours tweets" margin="normal" value={this.state.config.nbConcoursTweetsPerInterval} onChange={this.handleChange.bind(this)} />
            <TextField id="nbRandomTweetsPerInterval" name="nbRandomTweetsPerInterval" label="Nb randoms tweets" margin="normal" value={this.state.config.nbRandomTweetsPerInterval} onChange={this.handleChange.bind(this)} />
            <Button variant="contained" color="primary" onClick={this.updateButton.bind(this)}>Update</Button>
          </FormControl>}

        {value === 1 &&
          <FormControl component="fieldset">
            <TextField id="concoursRT" name="concoursRT" label="Concours RT" margin="normal" value={this.state.stats.concoursRT} style = {{width: 300}} />
            <TextField id="randomTweets" name="randomTweets" label="Random tweets" margin="normal" value={this.state.stats.randomRT} style = {{width: 300}} />
          </FormControl>}

        <Snackbar
          anchorOrigin={{ vertical, horizontal }}
          open={open}
          onClose={this.handleClose}
          message={<span id="message-id">{this.state.message}</span>}
        />
      </div>
    );
  }
}

export default App;
