/* global log */

var Container = require('../container'),
    Messages = require('../../../../../../network/messages'),
    Packets = require('../../../../../../network/packets'),
    Constants = require('./constants'),
    _ = require('underscore'),
    Items = require('../../../../../../util/items'),
    GXC = require('../../../../../../util/gxc');

module.exports = Inventory = Container.extend({

    init: function(owner, size) {
        var self = this;

        self._super('Inventory', owner, size);
    },

    load: function(ids, counts, abilities, abilityLevels) {
        var self = this;

        self._super(ids, counts, abilities, abilityLevels);

        self.owner.send(new Messages.Inventory(Packets.InventoryOpcode.Batch, [self.size, self.slots]));
    },

    add: function(item, count) {
        var self = this,
            slot = null;

        if (!count)
            count = -1;

        if (count === -1)  //default to moving whole stack
            count = parseInt(item.count);
        
        if(Items.isCurrency(item.id)) {
            if(Items.isCryptoCurrency(item.id)) {
                const symbol = Items.idToName(item.id);
                return GXC.getBalance(self.owner.username, symbol)
                .then(function(response){
                    console.log(response.data);
                    let balance = parseInt(response.data.coin.balance || 0);
                    return GXC.increaseBalance(self.owner.username, symbol, count)
                    .then(function(response) {
                        console.log(response.data);
                        balance = parseInt(response.data.coin.balance || 0);
                        var type = 'UPDATE IGNORE';
                        var updateData = { username: self.owner.username };
                        updateData[symbol] = balance;
                        self.owner.mysql.queryData(type, 'player_wallet', updateData);
                        var data = { type: symbol, amount: balance };
                        self.owner.send(new Messages.Wallet(Packets.WalletOpcode.Set, data));
                        if (item.instance) self.owner.world.removeItem(item);
                    });
                }).catch(function(error) {
                    console.error('error at increasing crypto..');
                    console.error(error);
                    if(error && error.response && error.response.data)
                        console.error(error.response.data);
                })
            } else {
                // not use
                var selectData = {
                    selector: ['GOLD'],
                    params: { username: self.owner.username }
                };
                self.owner.mysql.selectData('player_wallet', selectData, function(error, rows, fields) {
                    var type = 'INSERT INTO';
                    var balance = 0;
                    if (rows.length > 0) {
                        type = 'UPDATE IGNORE';
                        var info = rows.shift();
                        balance = info.gold;
                    }
                    balance += count;
                    var updateData = { username: self.owner.username, gold: balance };
                    self.owner.mysql.queryData(type, 'player_wallet', updateData);
                    var data = { type: 'GOLD', amount: balance };
                    self.owner.send(new Messages.Wallet(Packets.WalletOpcode.Set, data));
                    if (item.instance) self.owner.world.removeItem(item);
                });
            }
        } else {
            if (!self.canHold(item.id, count)) {
                self.owner.send(new Messages.Notification(Packets.NotificationOpcode.Text, Constants.InventoryFull));
                return false;
            }
            slot = self._super(item.id, count, item.ability, item.abilityLevel);
        
            if (!slot)
                return false;

            self.processAdd(item, slot);
        }

        return true;
    },

    processAdd: function(item, slot) {
        var self = this;

        self.owner.send(new Messages.Inventory(Packets.InventoryOpcode.Add, slot));

        self.owner.save();

        if (item.instance)
            self.owner.world.removeItem(item);
    },

    remove: function(id, count, index, callback) {
        var self = this;
        count = parseInt(count || 0);
        if(!Items.isCurrency(id)) {
            if (!index)
                index = self.getIndex(id);
            if (!self._super(index, id, count))
                return;
        }

        var processRemove = function() {
            if (!self._super(index, id, count))
            return;

            self.owner.send(new Messages.Inventory(Packets.InventoryOpcode.Remove, {
                index: parseInt(index),
                count: count
            }));

            self.owner.save();
        }

        if(Items.isCryptoCurrency(id)) {
            let symbol = Items.idToName(id);
            return GXC.getBalance(self.owner.username, symbol)
            .then(function(response) {
                let balance = response.balance;
                balance = parseInt(response.balance);
                if (balance < count) return self.owner.notify('You do not have enough money to purchase this.');

                return GXC.decreaseBalance(self.owner.username, symbol, count)
                .then(function(response) {
                    const balance = parseInt(response.data.coin.balance);
                    var type = 'UPDATE IGNORE';
                    var updateData = { username: self.owner.username};
                    updateData[symbol] = balance;
                    self.owner.mysql.queryData(type, 'player_wallet', updateData);
                    var data = { type: symbol, amount: balance };
                    self.owner.send(new Messages.Wallet(Packets.WalletOpcode.Set, data));
                    if (callback) callback();
                });
            }).catch(function(error) {
                console.error(error);
                console.error('error at load balance');
                console.error(error.response.data);
            });
        } else {
            processRemove(index, count);
        }
    },

    processRemove: function(index, count) {
        var self = this;

        self.owner.send(new Messages.Inventory(Packets.InventoryOpcode.Remove, {
            index: parseInt(index),
            count: count
        }));

        self.owner.save();
    }

});
