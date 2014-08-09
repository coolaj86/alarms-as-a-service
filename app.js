'use strict';

var connect = require('connect')
  , bodyParser = require('body-parser')
  , urlrouter = require('connect_router')
  , app = connect()
  , reschedule = require('reschedule')
  , request = require('request')
  , path = require('path')
  , Promise = require('es6-promise').Promise
  , crypto = require('crypto')
  ;

function addAlarm(req, res) {
  var body = req.body
    , event = { type: "webhook", data: body.data, webhooks: body.webhooks }
    , opts
    , rules
    ;
    
  rules = {
    dtstart: {
      utc: body.dtstart.utc // new Date(Date.now() + (5 * 1000))
    , locale: body.dtstart.locale // 'GMT-0600 (PDT)'
    , zoneless: body.dtstart.zoneless
    , tzid: body.dtstart.tzid
    }
  , rrule: body.rrule // { freq: "yearly" , count: 1 }
  };

  if (!rules.rrule) {
    rules.rrule = { freq: "yearly", count: 1 };
  }

  opts = {
    timeout: (5 * 60 * 60 * 1000)
    // TODO staletime
  , until: Date.now() + (1 * 24 * 60 * 60 * 1000)
  };

  Reschedule.schedule(event, rules, opts).then(
    function (schedule) {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(schedule, null, '  '));
    }
  , function (err) {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(
        { error: { message: "couldn't create schedule:" + err.toString() } }
      , null, '  '));
    }
  );
}

function removeAlarm(req, res) {
  var uuid = req.params.id
    ;

  res.setHeader('Content-Type', 'application/json');

  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(uuid)) {
    res.end(JSON.stringify(
      { error: { message: "bad uuid: " + uuid } }
    , null, '  '));
  }

  reschedule.unschedule(uuid).then(function (schedule) {
    res.end(JSON.stringify(schedule, null, '  '));
  });
}

function route(rest) {
  rest.get('/', function (req, res) {
    res.end('You found alarms!');
  });

  rest.post('/api/schedules', addAlarm);
  rest.post('/api/alarms', addAlarm);

  rest.delete('/api/schedules/:id', removeAlarm);
  rest.delete('/api/alarms/:id', removeAlarm);
}

module.exports = app
  .use(bodyParser.json())
  .use(urlrouter(route))
  ;

module.exports.create = function (opts) {
  opts = opts || { filename: path.join(__dirname, "reschedule.sqlite3") };

  function signRequest(payload) {
    payload.timestamp = Date.now();
    payload.token = crypto
      .randomBytes(16)
      .toString('hex')
      ;

    payload.signature = crypto
      .createHmac('sha1', event.secret)
      .update(new Buffer(payload.timestamp + payload.token, 'utf-8'))
      .digest('hex')
      ;

    return payload;
  }

  reschedule.create(opts).then(function (_reschedule) {
    reschedule = _reschedule;

    reschedule.on('appointment', function (event, details, done) {
      var hook = event.webhooks.occurrence
        , payload
        ;

      payload = {
        uuid: details.appt.schedule.uuid
      , next: details.next
      , data: event.data
      };

      if (event.secret) {
        signRequest(payload);
      }

      request.post(
        { url: hook
        , json: payload
        }
      , function (err, resp, body) {
          if (err) {
            console.error(err);
            done({ error: err });
            return;
          }

          if ('string' === typeof body) {
            try {
              body = JSON.parse(body);
            } catch(e) {
              body = null;
            }
          }

          if (body && body.snooze) {
            body.snooze = 1000 * (parseInt(body.snooze, 10) || 0);
            //appt.set('next', new Date( Date.now() + body.snooze  ).toISOString() );
            done({ snooze: body.snooze });
            return;
          }

          done();
        }
      );
    });

    reschedule.on('unschedule', function (schedule) {
      var event = schedule.event
        , hook = event.webhooks.stop
        , payload
        ;

      if (!hook) {
        return;
      }

      payload = {
        uuid: schedule.uuid
      , data: event.data
      };

      if (event.secret) {
        signRequest(payload);
      }

      request.post(
        { url: hook
        , json: payload 
        }
      , function (err/*, resp, body*/) {
          if (err) {
            console.error(err);
          }
        }
      );
    });
  });

  return app;
};
module.exports.alarms = { add: addAlarm, remove: removeAlarm };
