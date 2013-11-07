var request = require('request');
var cheerio = require('cheerio');
var _ = require('underscore');
_.mixin( require('underscore.deferred') );
var inflection = require('inflection');
var Twit = require('twit');
var T = new Twit(require('./config.js'));
var wordfilter = require('wordfilter');
var emoji = require('emoji');
var ent = require('ent');
var subtweets = '';

Array.prototype.pick = function() {
  return this[Math.floor(Math.random()*this.length)];
};
Array.prototype.pickRemove = function() {
  var index = Math.floor(Math.random()*this.length);
  return this.splice(index,1)[0];
};


var names = require('./first.js').names;

var alice = names.pickRemove();
var bob = names.pickRemove();

var looked = [
  'seemed',
  'looked',
  'appeared'
];

var cross = [
  'cross',
  'angry',
  'concerned',
  'disinterested'
];

var asked = [
  'asked',
  'inquired',
  'demanded',
  'asked',
  'asked'
];

var flinched = [
  'recoiled',
  'beamed',
  'flinched',
  'squirmed',
  'sighed'
];

function dialogue() {
  var funcs = [generate, generateBest, generateFav];
  funcs.pick().call();
}

function generate() {
  _.when(
    search('"why do you"'),
    search('"why would you"'))
    .done(function() {
      var total = _.flatten(arguments);
      //tweet = emoji.unifiedToHTML(tweet);
      //console.log(total);
      total = _.chain(total)
                .filter(function(el) {
                  return el.match(/why (would|do)[^?\.!]*/i);
                })
                .map(function(el) {
                  return el.match(/why (would|do)[^?\.!]*/i)[0];
                })
                .value();
      var why = total.pickRemove();
      var postWhy = why.replace(/why (would|do) you/i,'');
      var longest = _.max(postWhy.split(/\W/), function (el) {
         return el.length;
      });
      //console.log(longest);
      search('"because i" ' + longest)
        .done(function() {
  //        console.log(arguments);
          var res = _.chain(arguments)
            .flatten()
            .reject(function (el) {
              return el.match(/just bec/i);
            })
            .filter(function (el) {
              var reg = new RegExp('because i.*' + longest +'[^?\.!]', 'i');
              return el.match(reg);
            })
            .map(function (el) {
              return el.match(/because i[^?\.!]*/i)[0];
            })
            .value();
          var because = res.pick();

          var whys = [
            alice + ' ' + looked.pick() + ' ' + cross.pick() + '. "WHY?" she ' + asked.pick() + '.',
            '"WHY?"',
            '"WHY?" ' + asked.pick() + ' ' + alice + '.',
            '"WHY?" ' + alice + ' ' + asked.pick() + '.'
          ];

          var becauses = [
            '"BECAUSE," said ' + bob + '.',
            bob + ' ' + flinched.pick() + '. "BECAUSE."'
          ];

          if (why && because) {
            console.log(whys.pick().replace('WHY', (why)));
            console.log('');
            console.log(becauses.pick().replace('BECAUSE', (because)));
            console.log('');
          }

        });
    });
}

function generateBest() {
  _.when(
    search('"what is the best"'),
    search('"what\'s the best"')
    )
    .done(function() {
      var total = _.flatten(arguments);

      total = _.chain(total)
                .filter(function(el) {
                  return el.match(/(what is|what's) the best[^?\.!]*/i);
                })
                .map(function(el) {
                  return el.match(/(what is|what's) the best[^?\.!]*/i)[0];
                })
                .value();
      var question = total.pickRemove();
      var postQuestion = question.replace(/(what is|what's) the best /i,'');
      var subject = postQuestion.split(/\W/)[0];
      search('"is the best ' + subject + '" -what')
        .done(function() {
          var res = _.chain(arguments)
            .flatten()
            .filter(function(el) {
              return el.match(/.*\sis\s/i);
            })
            .map(function(el) {
              var pre = el.match(/.*\sis\s/i)[0].split('.');
              return pre[pre.length-1].replace(' is ','');
            })
            .value();
          var answer = res.pick();

          var questions = [
            alice + ' ' + looked.pick() + ' ' + cross.pick() + '. "WHAT?" she ' + asked.pick() + '.',
            '"WHAT?"',
            '"WHAT?"',
            '"WHAT?" ' + asked.pick() + ' ' + alice + '.',
            '"WHAT?" ' + alice + ' ' + asked.pick() + '.'
          ];

          var answers = [
            '"IS."',
            '"IS."',
            '"IS," said ' + bob + '.',
            bob + ' ' + flinched.pick() + '. "IS."'
          ];

          if (question && answer) {
            console.log(questions.pick().replace('WHAT', (question)));
            console.log('');
            console.log(answers.pick().replace('IS', (answer)));
            console.log('');
          }
        });
    });
}

function generateFav() {
  _.when(
    search('"what is your favorite"'),
    search('"what\'s your favorite"'),
    search('"what is your favourite"'),
    search('"what\'s your favourite"')
    )
    .done(function() {
      var total = _.flatten(arguments);

      total = _.chain(total)
                .filter(function(el) {
                  return el.match(/(what is|what's) your fav(o|ou)rite[^?\.!]*/i);
                })
                .map(function(el) {
                  return el.match(/(what is|what's) your fav(o|ou)rite[^?\.!]*/i)[0];
                })
                .value();
      var question = total.pickRemove();
      var postQuestion = question.replace(/(what is|what's) your fav(o|ou)rite /i,'');
      var subject = postQuestion.split(/\W/)[0];
      _.when(
        search('"is my favorite ' + subject + '" -what'),
        search('"is my favourite ' + subject + '" -what')
        )
        .done(function() {
          var res = _.chain(arguments)
            .flatten()
            .filter(function(el) {
              return el.match(/.*\sis\s/i);
            })
            .map(function(el) {
              var pre = el.match(/.*\sis\s/i)[0].split('.');
              return pre[pre.length-1].replace(' is ','');
            })
            .value();
          var answer = res.pick();

          var questions = [
            alice + ' ' + looked.pick() + ' ' + cross.pick() + '. "WHAT?" she ' + asked.pick() + '.',
            '"WHAT?"',
            '"WHAT?"',
            '"WHAT?" ' + asked.pick() + ' ' + alice + '.',
            '"WHAT?" ' + alice + ' ' + asked.pick() + '.'
          ];

          var answers = [
            '"IS."',
            '"IS."',
            '"IS," said ' + bob + '.',
            bob + ' ' + flinched.pick() + '. "IS."'
          ];

          if (question && answer) {
            console.log(questions.pick().replace('WHAT', (question)));
            console.log('');
            console.log(answers.pick().replace('IS', (answer)));
            console.log('');
          }
        });
    });
}

function search(term) {
  var dfd = new _.Deferred();
  T.get('search/tweets', { q: term, count: 100 }, function(err, reply) {
    var tweets = reply.statuses;
    tweets = _.chain(tweets)
      .map(function(el) {
        if (el.retweeted_status) {
          return ent.decode(el.retweeted_status.text);
        }
        else {
          return ent.decode(el.text);
        }
      })
      .reject(function(el) {
        return (el.indexOf('#') > -1 || el.indexOf('http') > -1 || el.indexOf('@') > -1 || el.indexOf('"') > -1 || el.indexOf(':') > -1 || el.length < 35);
      })
      .uniq()
      .value();
    dfd.resolve(tweets);
  });
  return dfd.promise();
}

dialogue();
setInterval(dialogue, 1000 * 10);
