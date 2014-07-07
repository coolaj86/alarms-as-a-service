alarms-as-a-service
===================

A web service built on top of reschedule.js, rrecur.js, and rrule.js for being notified when a one-time or repeat event is taking place.

POST /api/alarms
----------------

### Request

```javascript
{
  "dtstart": {
    "utc": "2014-06-16T12:40:00Z"
  , "zoneless": "2014-06-16T08:40:00"
  , "locale": "GMT-0400 (EDT)"
  , "tzid": "America/New_York"
  }

, "webooks": {
    "occurrence": "http://bin.mailgun.net/a90b3f8c"
  , "stop": "http://requestb.in/1hp8ppg1"
  }

, "data": {
    "foo": "bar"
  , "desc": "Whatever you supply to the 'data' field is what your webhook gets back"
  }

, rrule: {
    freq: 'yearly'
  }
}
```

NOTE:
  * `tzid` is not currently supported. You must use `locale` and either `utc` or `zoneless`.
  * You may supply `data` if you wish. It may contain whatever you like, but must be very few bytes.

### Response

```javascript
{ "uuid": "aedda258-0392-4b36-9e0c-274db9f7e9de", "next": "2014-07-16T08:40:00-0400" }
```

POST /your/webhook/occurence
------------------

```javascript
{ "uuid": "aedda258-0392-4b36-9e0c-274db9f7e9de"
, "next": "2014-06-16T08:40:00-0400"
, "data": { ... }
}
```

NOTE: `next` may be `null`

### Response

```javascript
{}
```

Or, if you want to postpone the alarm:

```javascript
{ "snooze": 900 } // 15 minutes in seconds
```


POST /your/webhook/stop
------------------

### Request

```javascript
{ "uuid": "aedda258-0392-4b36-9e0c-274db9f7e9de"
, "data": { ... }
}
```

### Response

```javascript
{}
```

Example Usage
-------------

```javascript
var url
  , rules
  ;

url = 'http://alarms.beta.coolaj86.com/api/schedules';

rules = {
  dtstart: {
    utc: new Date(Date.now() + (15 * 1000))
  , locale: 'GMT-0600 (MDT)'
  , tzid: 'America/Denver'
  }
, rrule: null
, webooks: {
    occurrence: "http://requestb.in/16rh3i11"
  , stop: "http://requestb.in/1hp8ppg1"
  }
, data: {
    foo: "bar"
  }
}

request.post({ url: url, json: rules }, function (err, resp, data) {
  console.error(err);
  console.log(data);
});
```

DIY
===

Install
------

```bash
npm install alarms-as-a-service
```

```javascript
'use strict';

var port = 3000
  , app
  , server
  ;

app = require('alarms-as-a-service').create();

server = app.listen(port, function () {
  console.log('Listening on ', server.address());
});
```

API
---

```javascript
module.exports.create() // returns an app
module.exports.alarms.add // function (req, res) {}
module.exports.alarms.remove // function (req, res) {}
```
