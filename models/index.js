const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.MYSQL_DATABASE || 'database',
  process.env.MYSQL_USERNAME || 'root',
  process.env.MYSQL_PASSWORD || '',
  {
    host: process.env.MYSQL_HOST || 'localhost',
    dialect: 'mysql',
    logging: console.log,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.users = require('./User')(sequelize, Sequelize);
db.groups = require('./group')(sequelize, Sequelize);
db.messages = require('./Message')(sequelize, Sequelize);
db.userGroups = require('./userGroups')(sequelize, Sequelize);

// Associations
db.users.belongsToMany(db.groups, { through: db.userGroups });
db.groups.belongsToMany(db.users, { through: db.userGroups });
db.messages.belongsTo(db.users);
db.messages.belongsTo(db.groups);

module.exports = db;