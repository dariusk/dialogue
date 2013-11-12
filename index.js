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

var house = {
  foyer: {
           name: 'foyer',
           objects: ['chandelier', 'side table'],
             actions: [
               'debated just leaving the house.'
             ],
           exits: ['living', 'frontyard', 'library']
         },
  living: {
            name: 'living room',
            objects: ['flat screen TV', 'coffee table'],
             actions: [
               'turned on the TV for a while.',
               'bounced on the sofa, hoping to recapture her childhood innocence.'
             ],
            exits: ['foyer', 'frontyard', 'dining']
          },
  dining: {
            name: 'dining room',
            objects: ['dining room table', 'silverware'],
            exits: ['living', 'patio', 'kitchen']
          },
  kitchen: {
             name: 'kitchen',
             objects: ['knife set', 'oven', 'fridge'],
             actions: [
               'rifled through the cabinets for alcohol.',
               'checked the fridge for snacks.'
             ],
             exits: ['dining', 'patio', 'pantry', 'breakfast']
           },
  patio: {
           name: 'back yard',
           objects: ['lawn furniture', 'gas grill'],
           exits: ['dining', 'kitchen', 'garage']
         },
  pantry: {
            name: 'closet',
            objects: ['broom', 'mop', 'bric-a-brac'],
             actions: [
               'surrepticiously rearranged the supplies.',
               'looked for some paper towels.'
             ],
            exits: ['kitchen']
          },
  breakfast: {
               name: 'breakfast nook',
               objects: ['table', 'juicer', 'toaster'],
               exits: ['kitchen']
             },
  garage: {
            name: 'garage',
            objects: ['BMW', 'riding lawnmower'],
            exits: ['patio', 'frontyard', 'greathall']
          },
  frontyard: {
               name: 'front yard',
               objects: ['lawn', 'tree'],
               exits: ['living', 'foyer', 'garage']
             },
  greathall: {
               name: 'great hall',
               objects: ['family portrait', 'tribal Afghan rug'],
               exits: ['library', 'bath', 'guestbed', 'masterbed']
             },
  library: {
             name: 'library',
             objects: ['bookshelf', 'mahogany work desk'],
             actions: [
               'flipped through some books.',
               'tried and failed to open the lock on the desk.'
             ],
             exits: ['foyer', 'greathall']
           },
  guestbed: {
              name: 'guest bedroom',
              objects: ['bed', 'poster of a... Monet?', 'set of curtains'],
              exits: ['greathall']
            },
  bath: {
          name: 'bathroom',
          objects: ['toilet', 'framed photo of a fish', 'nautical themed shower curtain'],
          exits: ['greathall']
        },
  masterbed: {
               name: 'master bedroom',
               objects: ['king-sized bed', 'teak dresser'],
               exits: ['greathall', 'masterbath']
             },
  masterbath: {
                name: 'master bathroom',
                objects: ['blonde onyx countertop', 'blonde onyx toilet', 'blonde onyx bathtub', 'blonde onyx flooring'],
                exits: ['masterbed']
              }
}

var names = require('./first.js').names;

function makeItems(num) {
  var result = [];

  var adjectives = [
    'crimson',
    'teal',
    'ostentatious',
    'fashionable'
  ];

  var nouns = [
    'scarf',
    'sweater',
    'hat',
    'skirt',
    'necklace',
    'phone'
  ];

  for (var i=0; i<num; i++) {
    result.push(adjectives.pick() + ' ' + nouns.pick());
  }

  return result;
}

function Actor() {
  return {
    name: names.pickRemove(),
    loc: house['frontyard'],
    items: makeItems(2),
    leaveRoom: function() {
      if (Math.random() < 0.6) {
        this.loc = house[this.loc.exits.pick()];
      }
      if (this.name === camera.name) console.log(this.name + ' went to the ' + this.room() + '.');
    },
    room: function() {
      return this.loc.name;
    },
    _done: false,
    done: function() {
      this._done = true;
      // true if every player is now done
      var dones = _.pluck(players, '_done');
      var allDone = _.every(dones);
      //if (allDone) {
        setTimeout(tick, 100);
     // }
    },
    commentObject: function() {
      var objects = this.loc.objects;
      if (objects) {
        newRoom(this);
        talkAboutObject(this.name, objects.pick());
        // If we've already done a solo action there's a good chance we'll do some thinking.
        if (Math.random() < 0.25) this.think(); 
      }
    },
    action: function() {
      var actions = this.loc.actions;
      if (actions) {
        newRoom(this);
        console.log(this.name + ' ' + actions.pick());
        // If we've already done a solo action there's a good chance we'll do some thinking.
        if (Math.random() < 0.25) this.think(); 
      }
    },
    think: function(other) {
       var others = _.chain(players)
                    .reject(function(el) { return el.name === this.name })
                    .pluck('name')
                    .value();
       var otherName = others.pick();
       var other = other || _.filter(players, function(el) {
         return el.name === otherName;
       })[0];

       var feelings = [
         'loved',
         'hated',
         'envied',
         'liked'
       ];
       
       var thoughts = '';
       thoughts += 'She thought about ' + other.name + '. ';
       if (Math.random() < 0.4) thoughts += other.name + ' and that ' + other.items.pick() + ' of hers. ';
       if (Math.random() < 0.4) thoughts += 'She ' + feelings.pick() + ' her so damn much. ';
       if (Math.random() < 0.4) thoughts += 'She wanted that ' + other.items.pick().split(' ')[1] + '. Nothing else would do. ';
       if (Math.random() < 0.4) thoughts += 'It was almost too much to deal with. ';
       if (Math.random() < 0.4) thoughts += 'Why couldn\'t she be more like her? ';
       if (Math.random() < 0.4) thoughts += 'Maybe if they could just be real with each other for once... ';
       if (Math.random() < 0.4) thoughts += 'Nobody really knew how she felt. ';
       if (Math.random() < 0.4) thoughts += 'Why did everyone want to be like her? ';
       if (Math.random() < 0.4) thoughts += 'Just thinking about it made her want to puke. ';
       if (Math.random() < 0.4) thoughts += 'Why did she come to this stupid house party in the first place? ';

       console.log(thoughts);

     }
  }
}

var players = [];
for (var i=0; i<6; i++) {
  players.push(new Actor());
}

var camera = players.pick();

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

function dialogue(actor1, actor2) {
  var dfd = _.Deferred();
  var random = Math.random();
  if (random < 1.5) {
    // do nothing
    dfd.resolve('');
  }
  else {
    var funcs = [generate, generateBest, generateFav, stare, stare, stare];
    funcs.pick().call(null, actor1, actor2, dfd);
  }
  return dfd.promise();
}

function solo(actor1) {
  var random = Math.random();
  if (random < -0.75) {
    // do nothing
  }
  else {
    var random2 = Math.random();
    if (random2 < 0.5) {
      actor1.commentObject();
    }
    else if (random2 < 1.75) {
      actor1.action();
    }
  }
}

function newRoom(actor) {
  console.log('\n');
  var news = [
    'After some time, ' + actor.name + ' found herself in the ' + actor.loc.name + '.',
    actor.name + ' entered the ' + actor.loc.name + '.',
    'Nobody was in the ' + actor.loc.name + ', so ' + actor.name + ' found herself uncharacteristically at ease.',
    '"Perfect, I\'ve got the ' + actor.loc.name + ' all to myself," thought ' + actor.name + '.'
  ];

  console.log(news.pick());
}

function tick() {
  var dialogues = [];
  // Move all players to new room
  _.each(players, function(player) {
    player._done = false;
    player.leaveRoom();
  });
  // Determine whether the camera stays or shifts
  if (Math.random() < 0) {
    camera = camera.pick();
  }
  var player = camera;
    var othersHere = _.filter(players, function(el) {
      return el.loc === player.loc && el.name !== player.name;
    });
    if (othersHere.length > 0) {
      var other = othersHere.pick();
      dialogue(player, other)
        .then(function() {
          player.done();
        });
    }
    else {
      solo(player);
      player.done();
    }
}

function encounter(actor1, actor2) {

  var encounters = [
    actor1.name + ' encountered ' + actor2.name + ' in the ' + actor1.loc.name + '.',
    actor1.name + ' and ' + actor2.name + ' ran into each other in the ' + actor1.loc.name + '.',
    actor1.name + ' entered the ' + actor1.loc.name + '. ' + actor2.name + ' was there, as if waiting.',
    'As ' + actor1.name + ' entered the ' + actor1.loc.name + ', she saw ' + actor2.name + ' making trouble.'
  ];

  console.log(encounters.pick());
}

function stare(actor1, actor2, dfd) {
  console.log('\n');
  encounter(actor1, actor2);
  var stares = [
    actor1.name + ' stared at ' + actor2.name + ' suspiciously.',
    actor1.name + ' avoided ' + actor2.name + '.',
    actor1.name + ' eyed ' + actor2.name + '\'s ' + actor2.items.pick() + ' with envy.',
    '"Where did you get that ' + actor2.items.pick().split(' ')[1] + ', ' + actor2.name + '?" ' + actor2.name +' ignored her.',
    actor1.name + ' played nervously with her ' + actor1.items.pick().split(' ')[1] + ' in a successful bid to avoid talking to ' + actor2.name + '.'
  ];
  console.log(stares.pick());
  if (Math.random() < 0.25) actor1.think(actor2);
  dfd.resolve('');
}

function generate(actor1, actor2, dfd) {
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
      if (!why) {
        return;
      }
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

          console.log('\n');
          encounter(actor1, actor2);
          //console.log(actor1.name + ' encountered ' + actor2.name + ' in the ' + actor1.loc.name + '.');

          var whys = [
            actor1.name + ' ' + looked.pick() + ' ' + cross.pick() + '. "WHY?" she ' + asked.pick() + '.',
            '"WHY?"',
            '"WHY?" ' + asked.pick() + ' ' + actor1.name + '.',
            '"WHY?" ' + actor1.name + ' ' + asked.pick() + '.'
          ];

          var becauses = [
            '"BECAUSE," said ' + actor2.name + '.',
            actor2.name + ' ' + flinched.pick() + '. "BECAUSE."'
          ];

          if (why && because) {
            console.log(whys.pick().replace('WHY', (why)));
            console.log('');
            console.log(becauses.pick().replace('BECAUSE', (because)));
            console.log('');
          }

          dfd.resolve('');

        });
    });
}

function generateBest(actor1, actor2, dfd) {
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
      if (!question) {
        return;
      }
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

          console.log('\n');
          encounter(actor1, actor2);
          //console.log(actor1.name + ' encountered ' + actor2.name + ' in the ' + actor1.loc.name + '.');

          var questions = [
            actor1.name + ' ' + looked.pick() + ' ' + cross.pick() + '. "WHAT?" she ' + asked.pick() + '.',
            '"WHAT?"',
            '"WHAT?"',
            '"WHAT?" ' + asked.pick() + ' ' + actor1.name + '.',
            '"WHAT?" ' + actor1.name + ' ' + asked.pick() + '.'
          ];

          var answers = [
            '"IS."',
            '"IS."',
            '"IS," said ' + actor2.name + '.',
            actor2.name + ' ' + flinched.pick() + '. "IS."'
          ];

          if (question && answer) {
            console.log(questions.pick().replace('WHAT', (question)));
            console.log('');
            console.log(answers.pick().replace('IS', (answer)));
            console.log('');
          }

          dfd.resolve('');
        });
    });
}

function generateFav(actor1, actor2, dfd) {
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
      if (!question) {
        return;
      }
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

          console.log('\n');
          encounter(actor1, actor2);
          //console.log(actor1.name + ' encountered ' + actor2.name + ' in the ' + actor1.loc.name + '.');

          var questions = [
            actor1.name + ' ' + looked.pick() + ' ' + cross.pick() + '. "WHAT?" she ' + asked.pick() + '.',
            '"WHAT?"',
            '"WHAT?"',
            '"WHAT?" ' + asked.pick() + ' ' + actor1.name + '.',
            '"WHAT?" ' + actor1.name + ' ' + asked.pick() + '.'
          ];

          var answers = [
            '"IS."',
            '"IS."',
            '"IS," said ' + actor2.name + '.',
            actor2.name + ' ' + flinched.pick() + '. "IS."'
          ];

          if (question && answer) {
            console.log(questions.pick().replace('WHAT', (question)));
            console.log('');
            console.log(answers.pick().replace('IS', (answer)));
            console.log('');
          }

          dfd.resolve('');
        });
    });
}

function search(term) {
  var dfd = new _.Deferred();
  T.get('search/tweets', { q: term, count: 100 }, function(err, reply) {
    if (!err) {
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
    }
    else {
      dfd.resolve([]);
    }
  });
  return dfd.promise();
}

function talkAboutObject(name, object) {
  var talks = [
    'The ' + object + ' caught her eye. She thought it was the ugliest thing she\'d ever seen.',
    'She stared at the ' + object + ' uncomprehendingly.',
    '"Wow, check out that ' + object + '," she said to no one in particular.',
    'She dutifully avoided the ' + object + ' out of some primal respect for its otherness.'
  ];
  console.log(talks.pick());
}

tick();
