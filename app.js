'use strict';

var connect = require('connect')
  , bodyParser = require('body-parser')
  , urlrouter = require('connect_router')
  , app = connect()
  , reschedule = require('reschedule')
  , request = require('request')
  , path = require('path')
  , opts = { filename: path.join(__dirname, "reschedule.sqlite3") }
  , Reschedule
  , Promise = require('es6-promise').Promise
  ;

reschedule.create(opts).then(function (_Reschedule) {
  Reschedule = _Reschedule;

  Reschedule.on('appointment', function (event, appt, done) {
    console.log('appointment');
    console.log('event');
    console.log(event);

    var hook = event.webhooks.occurrence
      ;

    request.post({ url: hook, json: event.data }, function (err, resp, body) {
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
        body.snooze = parseInt(body.snooze, 10);
        //appt.set('next', new Date( Date.now() + body.snooze  ).toISOString() );
        done({ snooze: body.snooze });
        return;
      }

      done();
    });
  });

  Reschedule.on('unschedule', function (schedule) {
    console.log('[unschedule]');
    console.log(schedule);

    var event = schedule.event
      , hook = event.webhooks.stop
      ;

    if (!hook) {
      return;
    }

    request.post({ url: hook, json: event.data }, function (err/*, resp, body*/) {
      if (err) {
        console.error(err);
      }
    });
  });
});

function route(rest) {
  rest.get('/', function (req, res) {
    res.end('You found alarms!');
  });
  rest.post('/api/schedules', function (req, res) {
    console.log('[POST data]');
    console.log(req.body);

    var body = req.body
      , event = { type: "webhook", data: body.data, webhooks: body.webhooks }
      , opts
      , rules
      ;
      
    console.log('req.body');
    console.log(rules);

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

    console.log(rules);
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
  });
  rest.delete('/api/schedules/:id', function (req, res) {
    var uuid = req.params.id
      ;

    res.setHeader('Content-Type', 'application/json');

    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(uuid)) {
      res.end(JSON.stringify(
        { error: { message: "bad uuid: " + uuid } }
      , null, '  '));
    }

    Reschedule.unschedule(uuid).then(function (schedule) {
      res.end(JSON.stringify(schedule, null, '  '));
    });
  });
}

module.exports = app
  .use(bodyParser.json())
  .use(urlrouter(route))
  ;
