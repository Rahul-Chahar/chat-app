module.exports = (sequelize, Sequelize) => {
    const UserGroups = sequelize.define('UserGroups', {
      isAdmin: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      }
    });
  
    return UserGroups;
  };
  