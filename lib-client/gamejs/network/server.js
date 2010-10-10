var events = require('gamejs/network/events');
var arrays = require('gamejs/utils/arrays');
var log = require('ringo/logging').getLogger('WC.SOCKET');

var Player = exports.Player = function(socket, name) {
   this.name = name || 'new player';
   this.isReady = false;
   // FIXME
   this.id = Math.random() * 99999;
   this.socket = socket;
   
   this.send = function(event) {
      this.socket.send(JSON.stringify(event));
   };
   this.serialize = function() {
      return {
         id: this.id,
         isReady: this.isReady,
         name: this.name,
      }
   };
   return this;
};

var NetworkController = exports.NetworkController = function(id, gameClass) {
   var games = {};
   
   this.dispatch = function(event, player) {
      if (event.type == events.PLAYER_CREATE_GAME) {
         // FIXME
         var id = Math.random() * 99999;
         games[id] = new gameClass(id);
         log.info('creating game #', id);
         // BAIL OUT
         return;
      // LIST GAMES
      } else if (event.type === events.PLAYER_LIST_GAMES) {
         log.info('listing games for #', player.id);
         var gameIds = Object.keys(games);
         player.send({
            type: events.GAME_LIST_GAMES,
            gameIds: gameIds,
         });
         // BAIL OUT
         return;
      } else if (!games[event.gameId]) {
         log.error('missing or invalid game id #', gameId);
         // BAIL OUT
         return;
      }
      var gameId = event.gameId;
      // GAME_CUSTOM_EVENT -> send to clietns
      if (event.type === events.GAME_CUSTOM) {
         log.info('dispatching to game #', gameId);
         games[gameId].dispatch(event);
      // JOIN
      } else if (event.type === events.PLAYER_JOIN) {
         log.info('player joined #', player.id);
         games[gameId].players.push(player);
         games[gameId].dispatch({
            type: events.GAME_PLAYER_JOINED,
            player: player.serialize(),
            gameId: gameId,
         });
      // LEAVE
      } else if (event.type === events.PLAYER_LEAVE) {
         log.info('player left #', player.id);
         arrays.remove(player, games[gameId].players);
         games[gameId].dispatch({
            type: events.GAME_PLAYER_LEFT,
            player: player.serialize(),
            gameId: gameId,               
         });
     }
   };
}

/**
 * your serverside game will probably extend this.
 */
var Game = exports.Game = function(id) {
   this.players = [];
   this.id = id;
   return this;
};

Game.prototype.send = function(event) {
   event.gameId = this.id;
   this.players.forEach(function(player) {
      player.send(event);
   }, this);
   return;
};

Game.prototype.update = function() {
   // do game logic updates here
};

Game.prototype.dispatch = function(event) {
   // default impl just forwards to all players
   this.send(event);
   return;
};