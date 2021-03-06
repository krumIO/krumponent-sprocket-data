/**
`krumponent-sprocket-data`
Component for Sprocket data subscription

@demo demo/index.html 
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import '@polymer/polymer/polymer-legacy.js';

import io from '/web_modules/socket.io-client.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';

Polymer({
  _template: html`
    <style>
      :host {
        display: none;
      }
    </style>
`,

  is: 'krumponent-sprocket-data',

  /**
  * Fired when data is received from Sprocket subscription.
  *
  * @event data-received
  * @param {object} data the data received
  */

  properties: {
    /** Enable console logging for this element */
    log: {
      type: Boolean,
      value: false,
    },
    /** Connect automatically, reconnect on changes */
    auto: {
      type: Boolean,
      value: false,
    },
    /** Sprocket user ID */
    sprocketUser: {
      type: String
    },
    /** Sprocket secret/token */
    sprocketSecret: {
      type: String
    },
    /** Sprocket stream ID (temporarily a single feed per component instance) */
    sprocketStream: {
      type: String
    },
    /** Last message/data received from subscription */
    data: {
      type: Object,
      notify: true
    },
    sprocketUrl: {
      type: String,
      value: "/"
      //value: "localhost:9999"
    },
    _status: {
      type: String,
    }
  },

  observers: [
    '_streamChanged(sprocketUser, sprocketSecret, sprocketStream)',
    '_urlChanged(sprocketUrl)',
    // '_statusChanged(_status)'
  ],

  attached: function(){
    if(this.auto)
      this.connect();
  },

  /** Initiate connection to Sprocket */
  connect: function(){
    this._log("initializing connection..");
    if(this.sprocketUser && this.sprocketSecret && this.sprocketStream){
      if(!this._socket){
        this._socket = new io.connect(this.sprocketUrl);
        // future // this._socket = io.connect(this.sprocketUrl, {query: 'token='+this.auth.token});
        this._socket.on('connect', function () {
            this._status = "connected";
            this._log(this._status);
            this._subscribe();
            this.dispatchEvent(new CustomEvent('socket-connected', {
                bubbles: true,
                composed: true,
                detail: {
                    url: this.sprocketUrl,
                    status: this._status,
                },
            }));
        }.bind(this));

        this._socket.on('reconnect', function () {
            this._status = "connected";
            this._log(this._status);
            this._subscribe();
            this.dispatchEvent(new CustomEvent('socket-reconnected', {
                bubbles: true,
                composed: true,
                detail: {
                    url: this.sprocketUrl,
                    status: this._status,
                },
            }));
        }.bind(this));

        this._socket.on('connect_error', function (err) {
            this._status = "error";
            this._log(this._status, err);
            this.dispatchEvent(new CustomEvent('socket-connect-error', {
                bubbles: true,
                composed: true,
                detail: {
                    url: this.sprocketUrl,
                    status: this._status,
                    error: err,
                },
            }));
        }.bind(this));

        this._socket.on('connect_timeout', function (err) {
            this._status = "error";
            this._log(this._status, err);
            this.dispatchEvent(new CustomEvent('socket-connect-error', {
                bubbles: true,
                composed: true,
                detail: {
                    url: this.sprocketUrl,
                    status: this._status,
                    error: err,
                },
            }));
        }.bind(this));

        this._socket.on('error', function (err) {
            this._status = "error";
            this._log(this._status, err);
            this.dispatchEvent(new CustomEvent('socket-error', {
                bubbles: true,
                composed: true,
                detail: {
                    url: this.sprocketUrl,
                    status: this._status,
                    error: err,
                },
            }));
        }.bind(this));

        this._socket.on('disconnect', function () {
            this._status = "disconnected";
            this._log(this._status);
            this._cleanup();
            this.dispatchEvent(new CustomEvent('socket-disconnected', {
                bubbles: true,
                composed: true,
                detail: {
                    url: this.sprocketUrl,
                    status: this._status,
                },
            }));
        }.bind(this));
      }

      
    }
  },

  /** If the url changes, we must reconnect for the socket to use the new url. */
  _urlChanged: function(sprocketUrl) {
      if(this.auto) {
          // This is wrapped in a set timeout to avoid timing bugs when the url is
          // set immediately.
          setTimeout(function() {
              this.reconnect();
          }.bind(this), 0);
      }
  },

  /** Cleans up the socket and then reconnects. */
  reconnect: function() {
    // Cleanup old socket.
    if(this._socket) {
      this._cleanup();
      this._socket.destroy();
      this.set('_socket', undefined);
    }
    this.connect();
  },

  /** Initiate connection to Sprocket. Will always be called by detached. */
  disconnect: function(){
      this._socket.emit('unsubscribe');
  },

  ready: function(){
    
  },

  detached: function() {
    // this.disconnect();
  },

  /** Print log message if logging is enabled */
  _log: function(log){
    if(this.log){
      console.log(log);
    }
  },

  /** Detect subscription changes and trigger reconnect workflow */
  _streamChanged: function(user, secret, stream){
    if(this._socket)
      this.disconnect();
    this.connect();
  },

  /** Detect connection status changes and handle subscription handshake */
  _statusChanged: function(status){
    if(status + "" == "connected")
      this._subscribe();
    
    if(status + "" == "disconnected")
      this._cleanup();
  },

  _subscribe: function(){
    //subscribe to feed
    this._log(this._socket);
    this._log("subscription");
    this._socket.emit('subscribe', { user : this.sprocketUser, secret : this.sprocketUser, stream : this.sprocketStream } );

    this._socket.on("complete", function(message){
      this._log("subscription status - " + JSON.stringify(message));
    }.bind(this));

    this._socket.on("feeddata", function(message){
      this._log(message);
      this.set('data', message);
      this.dispatchEvent(new CustomEvent('data-received', { detail: message }));
    }.bind(this));
  },

  _cleanup: function(){
    this._log("cleanup");
    // kill the listeners
    this._socket.removeAllListeners("connect");
    this._socket.removeAllListeners("disconnect");
    this._socket.removeAllListeners("complete");
    this._socket.removeAllListeners("feeddata");
  }
});
