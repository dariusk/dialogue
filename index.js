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

// from underscore.string
function toSentence (array, separator, lastSeparator, serial) {
  separator = separator || ', ';
  lastSeparator = lastSeparator || ', and ';
  var a = array.slice(), lastMember = a.pop();
  if (array.length > 2 && serial) lastSeparator = _s.rtrim(separator) + lastSeparator;
  return a.length ? a.join(separator) + lastSeparator + lastMember : lastMember;
}

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
               actions: [
                'drank some juice, fuck it, right? Whose house even was this?'
               ],
               exits: ['kitchen']
             },
  garage: {
            name: 'garage',
            objects: ['BMW', 'riding lawnmower'],
            actions: [
              'considered getting on that lawnmower and riding it out of this place.',
              'peered in the car door for some kind of clue as to whose house this was.',
              'tried to jimmy the lock on the car and ended up setting off the alarm. Whoops.'
            ],
            exits: ['patio', 'frontyard', 'greathall']
          },
  frontyard: {
               name: 'front yard',
               objects: ['lawn', 'tree'],
               actions: [
                 'started to climb the tree, then thought better of it.',
                 'ran her fingers through the well-manicured grass, dreaming of better days.'
               ],
               exits: ['living', 'foyer', 'garage']
             },
  greathall: {
               name: 'great hall',
               objects: ['family portrait', 'tribal Afghan rug'],
               actions: [
                 'took off her shoes, got a running start, a slid in her socks down the slick hardwood floors.',
                 'stared down the hall, which seemed longer than it had any right to be.'
               ],
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
              actions: [
                'imagined what kind of people had stayed in the bed. How many people had had sex in it?',
                'guessed that this was the most boring room in the house.'
              ],
              exits: ['greathall']
            },
  bath: {
          name: 'bathroom',
          objects: ['toilet', 'framed photo of a fish', 'nautical themed shower curtain'],
          actions: [
            'relieved herself.',
            'jiggled the toilet handle.',
            'looked around for tampons, finding none.',
            'was afraid, as she always was, that a murderer lay in ambush behind the shower curtain.'
          ],
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
var dreams = require('./dreams.js');

function makeItems(num) {
  var result = [];

  // Must be a single word
  var adjectives = [
    'crimson',
    'teal',
    'ostentatious',
    'fashionable',
    'aquamarine',
    'emerald',
    'amazing',
    'incredible',
    'mind-blowing'
  ];

  var nouns = [
    'scarf',
    'sweater',
    'hat',
    'skirt',
    'necklace',
    'phone',
    'purse',
    'belt',
    'watch',
    'jacket',
    'shirt',
    'coat'
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
      //console.log(this.name + ' went to the ' + this.room() + '.');
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
      if (allDone) {
        setTimeout(tick, 1000 * 12);
      }
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
       var otherName = others.pickRemove();
       var other = other || _.filter(players, function(el) {
         return el.name === otherName;
       })[0];
       var cronyName = others.pick();

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
       
       function add(string) {
         if (Math.random() < 0.4) return string + ' ';
         else return '';
       }

       var ailment = [
        'were such total bitches',
        'never talked to her',
        'thought they were so much better than everyone else',
        'got better grades than her',
        'had more money than she did',
        'didn\'t have to try hard to be liked'
       ].pick();
       var school = 'She thought about school, and how ' + other.name + ' and ' + cronyName + ' ' + ailment + '. ';
       school += add('Why did they leave whenever she entered a room?');
       school += add('Were they jealous of her somehow? Not likely.');
       school += add('How could that even be possible?');
       school += add('Did they secretly like her after all? It didn\'t matter anyway.');
       school += add('They were always laughing with their perfect friends.');
       school += add('They walked around the school like they owned the place.');
       school += add('They were queen bees and they knew it.');
       school += add('They never invited her to parties; it was a fluke she ended up at this one.');
       school += add('They always got they wanted. Always.');
       school += add('But life was probably hard for them too, in its own way. It always is.');
       school += add('Did they suspect she thought about them so much?');

       var out = [thoughts, school].pick();
       console.log(out);

     }
  }
}

var players = [];
for (var i=0; i<6; i++) {
  players.push(new Actor());
}

// intro
console.log(toSentence(_.pluck(players, 'name')) + ' found themselves dropped off at the same party at the same time by their respective mothers. How awkward.');


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
  'sighed',
  'chuckled',
  'laughed',
  'yawned',
  'yelled'
];

function dialogue(actor1, actor2) {
  var dfd = _.Deferred();
  var random = Math.random();
  if (random < 0.5) {
    // do nothing
    dfd.resolve('');
  }
  else {
    var funcs = [generate, generateBest, generateFav, stare, stare, stare, dream];
    funcs.pick().call(null, actor1, actor2, dfd);
  }
  return dfd.promise();
}

function dream(actor1, actor2, dfd) {
  var pre = [
    actor2.name + ' looked directly at ' + actor1.name + '. "I had the weirdest dream," she said.',
    actor2.name + ' stiffened and began to ramble, not noticing ' + actor1.name + ', as if in a fugue state.',
    '"' + actor2.name + ', what did you dream about last night?" asked ' + actor1.name + '. ' + actor2.name + ' seemed wary, but her face softened.',
    '"Dreams," ' + actor1.name + ' said. "Tell me about your dreams." ' + actor2.name + ' almost said nothing, but thought better of it.',
    actor2.name + ' was crying. ' + actor1.name + ' acted on instinct. "Tell me all about it." she said. ' + actor2.name + ' obliged in an unbecoming outpouring.',
  ].pick();
  encounter(actor1, actor2);
  console.log(pre + '\n"' + dreams.pick() + '"');
  dfd.resolve('');
}
function solo(actor1) {
  var random = Math.random();
  if (random < 0.2) {
    // do nothing
  }
  else {
    var random2 = Math.random();
    if (random2 < 0.45) {
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
    '"Perfect, I\'ve got the ' + actor.loc.name + ' all to myself," thought ' + actor.name + '.',
    'The ' + actor.loc.name + ' was empty. Finally, ' + actor.name + ' thought, somewhere she could think.',
    actor.name + ' looked around the ' + actor.loc.name + '.',
    actor.name + ' breathed deeply and took in sights of the ' + actor.loc.name + '.'
  ];

  console.log(news.pick());
}

function tick() {
  var dialogues = [];
  _.each(players, function(player) {
    player._done = false;
    player.leaveRoom();
  });
  _.each(players, function(player) {
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
  });
}

function encounter(actor1, actor2) {

  var encounters = [
    actor1.name + ' encountered ' + actor2.name + ' in the ' + actor1.loc.name + '.',
    actor1.name + ' and ' + actor2.name + ' ran into each other in the ' + actor1.loc.name + '.',
    actor1.name + ' entered the ' + actor1.loc.name + '. ' + actor2.name + ' was there, as if waiting.',
    'As ' + actor1.name + ' entered the ' + actor1.loc.name + ', she saw ' + actor2.name + ' making trouble.',
    actor1.name + ' found ' + actor2.name + ' in the ' + actor1.loc.name + '.',
    actor1.name + ' entered the ' + actor1.loc.name + ' to find ' + actor2.name + ' standing there.',
    actor1.name + ' walked into the ' + actor1.loc.name + ' and saw ' + actor2.name + '. Great.',
    'The ' + actor1.loc.name + ' held two items of interest to ' + actor1.name + ': the ' + actor1.loc.objects.pick() + ' and ' + actor2.name + '.'
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
    'She dutifully avoided the ' + object + ' out of some primal respect for its otherness.',
    'The ' + object + ' reminded her of her mother. Barf.',
    'She noticed the ' + object + '. Kinda tacky.',
    'The next thing she saw was the ' + object + ', which left her feeling disquieted.'
  ];
  var posts = [
    'Why she noticed in the first place was beyond her.',
    'She didn\'t give it a second thought.',
    'She was hoping it would distract her, if for some brief moment, from her life.',
    'Things. The house was full of things. When she got old enough to have a house, she\'d own nothing.',
    'Part of her, a larger part than she cared to admit, wanted to smash it.',
    'She wished the booze would kick in.',
    'She heard a noise from somewhere else in the house.'
  ];
  console.log(talks.pick() + ' ' + posts.pick());
}

tick();
