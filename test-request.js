'use strict';

var request = require('request')
  , url = 'http://alarms.beta.coolaj86.com/api/schedules'
  , rules
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
};

request.post({ url: url, json: rules }, function (err, resp, data) {
  console.error(err);
  console.log(data);
});
