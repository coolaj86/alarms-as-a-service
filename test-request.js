'use strict';

var request = require('request')
  , crypto = require('crypto')
  , scmp = require('scmp')
  , url = 'http://alarms.beta.coolaj86.com/api/schedules'
  , rules
  , secret = crypto.randomBytes(32).toString('hex')
  , secureRequest
  ;

rules = {
  dtstart: {
    utc: new Date(Date.now() + (15 * 1000))
  , locale: 'GMT-0600 (MDT)'
  }
, rrule: null
, webooks: {
    occurrence: "http://requestb.in/16rh3i11" // http://requestb.in/16rh3i11?inspect
  , stop: "http://requestb.in/1hp8ppg1" // http://requestb.in/1hp8ppg1?inspect
  }
, data: {
    foo: "bar"
  }
, secret: secret
};

function createSignatureVerifier(hashType, signatureEncoding) {
  var tokens = {}
    , tokenExpirey = 15 * 60 * 1000
    ;

  return function verifySignature(req) {
    var timestamp = parseInt(req.body.timestamp, 10) || 0
      , token = req.body.token
      , signature = req.body.signature
      , fresh = (Math.abs(Date.now() - timestamp) < tokenExpirey)
      ;

    if (!fresh) {
      console.error('[request-forgery] Stale Timestamp: this may be an attack');
      console.error('[request-forgery] However, this is most likely your fault\n');
      console.error('[request-forgery] run `ntpdate ntp.ubuntu.com` and check your system clock\n');
      console.error('[request-forgery] System Time: ' + new Date().toString());
      console.error('[request-forgery] Remote Time: ' + new Date(timestamp).toString(), timestamp);
      console.error('[request-forgery] Delta: ' + (Date.now() - timestamp));
      return false;
    }

    if (tokens[token]) {
      console.error('[request-forgery] Replay Attack');
      return false;
    }

    tokens[token] = true;

    setTimeout(function () {
      delete tokens[token];
    }, tokenExpirey + (5 * 1000));

    return scmp(
      signature
    , crypto.createHmac(hashType, secret)
      .update(new Buffer(timestamp + token, 'utf-8'))
      .digest(signatureEncoding)
    );
  };
}

// this can be used 
secureRequest = createSignatureVerifier('sha1', 'hex');

request.post({ url: url, json: rules }, function (err, resp, data) {
  console.error(err);
  console.log(data);
});
