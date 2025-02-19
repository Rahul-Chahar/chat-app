
module.exports = (sequelize, Sequelize) => {
    const ArchivedMessage = sequelize.define('archivedMessage', {
      content: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      timestamp: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      fileUrl: {
        type: Sequelize.STRING,
        allowNull: true
      },
      fileType: {
        type: Sequelize.STRING,
        allowNull: true
      },
      originalUserId: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      originalGroupId: {
        type: Sequelize.INTEGER,
        allowNull: false
      }
    });
  
    return ArchivedMessage;
  };
  