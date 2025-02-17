module.exports = (sequelize, Sequelize) => {
    const Message = sequelize.define('message', {
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
      }
    });
  
    return Message;
  };