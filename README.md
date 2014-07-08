alarms-as-a-service
===================

A web service built on top of [reschedule.js](https://github.com/coolaj86/node-reschedule),
[rrecur.js](https://github.com/coolaj86/rrecurjs),
and [rrule.js](https://github.com/jakubroztocil/rrule)
for being notified
when a one-time or repeat event is taking place.

Current beta at http://alarms.beta.coolaj86.com

POST /api/alarms
----------------

All events MUST specify `webhooks`

  * `occurrence` fires for every occurrence of an alarm
  * `stop` fires if and when the alarm has had its last occurrence

All events MUST specify `dtstart`

  * EITHER a `utc` OR `zoneless`
  * EITHER `locale` OR `tzid` (not currently supported)

All events MAY specify `data`

Only recurring events must specify `rrule`

  * `freq` is one of `yearly`, `monthly`, `weekly`, `daily`, `hourly`, `minutely`, `secondly`
  * `interval` is a number of how many to skip (every 3 days, every 6 months)
  * `count` how many occurrences from `dtstart` (every 2 months, 10 times in total)
  * `until` is the date of the last event (in UTC)
  * `by<<unit>>` an array of integers describing the months, dates, etc when the event should fire
    * `bymonth` 1-12 (i.e the school year `[1, 2, 3, 4, 5, 9, 10, 11, 12]`)
    * `bymonthday` 1-31
    * `byyearday` 1-366
    * `byweekno` 1-53
    * `byday` weekday abbrevs `['su', 'mo', 'tu', 'we', 'th', 'fr', 'sa', 'su']` (using RRULE `byday` instead of `rrule.js`' `byweekday`)
      * `-1su` the last sunday
      * `2we` the second wednesday
    * `byhour` 0-23
    * `byminute` 0-59
    * `bysecond` 0-59
  * `bysetpos` is something I don't understand, but it's supported by `rrule.js`
  * `wkst` which day the week starts on (i.e. `su` or `mo`)

Provide any hex string to `secret` and it will be used to secure your webhooks against request forgery
(see [example](https://gist.github.com/coolaj86/81a3b61353d2f0a2552c)).
Try `require('crypto').randomBytes(32).toString('hex')`.

See [rrule.js](https://github.com/jakubroztocil/rrule#api) and the [RFC 2445 / RRULE](http://www.kanzaki.com/docs/ical/rrule.html) spec for more detail.

### Example Request to /api/alarms

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

, secret: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

NOTE:
  * `tzid` is not currently supported. You must use `locale` and either `utc` or `zoneless`.
  * You may supply `data` if you wish. It may contain whatever you like, but must be very few bytes.

### Example Response from /api/alarms

```javascript
{ "uuid": "aedda258-0392-4b36-9e0c-274db9f7e9de"
, "next": "2014-07-16T08:40:00-0400"
}
```

POST example.com/webhooks/occurrence
------------------

The alarm request that comes to you may look like this:

```javascript
{ "uuid": "aedda258-0392-4b36-9e0c-274db9f7e9de"
, "next": "2014-06-16T08:40:00-0400"
, "data": { ... }
}
```

NOTE: `next` may be `null`

### Example Response you send back

```javascript
{}
```

Or, if you want to postpone the alarm:

```javascript
{ "snooze": 900 } // 15 minutes in seconds
```


POST example.com/webhooks/stop
------------------

The request that comes to you will look like this

```javascript
{ "uuid": "aedda258-0392-4b36-9e0c-274db9f7e9de"
, "data": { ... }
}
```

### Example Response you send back

```javascript
{}
```

Install
=======

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

Example Usage
=============

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

If you want to be custom, go check out reschedule.js

API
---

```javascript
module.exports.create() // returns an app
module.exports.alarms.add // function (req, res) {}
module.exports.alarms.remove // function (req, res) {}
```

TODO
====

Should `next` show the snooze time or the original time?

PrivateKey + Timestamp + Signature on webhooks
