const TelegramBot = require('node-telegram-bot-api');
const {Post, Department, School, Category } = require('../back/models/schema')
const TOKEN='6239200648:AAFSA48rSFmaSJjtHxN-yntHDtVc5y7K0Gg';
const bot = new TelegramBot(TOKEN, {polling: true});

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;

    if (msg.text==='/start'){
      bot.sendMessage(chatId, `Welcome to ASTU IF Telegram bot. \n \n \n use the following command. 
      \n /start     =>    first page 
      \n /latest    =>    for latest posts
      \n /dep       =>    for departement posts
      \n /school  =>    for school posts`);
    }

    else if(msg.text){
        const love =msg.text.toLowerCase();

        if (love === '/latest') {
          try {
            let offset = 0;
            let posts = await Post.findAll({
              order: [['createdAt', 'DESC']],
              limit: 5,
              offset: offset,
            });
        
            if (!posts || !posts.length) {
              return bot.sendMessage(chatId, 'No post found');
            }
            
        
            while (posts.length > 0) {
              for (const post of posts) {
                const message = `Staff Name: ${post.staffName}\nContent: ${post.content}\nDate: ${post.createdAt}`;
                await bot.sendMessage(chatId, message);
              }
        
              offset += 5;
              posts = await Post.findAll({
                order: [['createdAt', 'DESC']],
                limit: 5,
                offset: offset,
              });
        
              if (!posts || !posts.length) {
                break;
              }
        
              await bot.sendMessage(chatId, 'Click the button below to retrieve the next 5 posts', {
                reply_markup: {
                  inline_keyboard: [
                    [{ text: 'Next', callback_data: 'next' }],
                  ],
                },
              });
        
              const next = await new Promise((resolve) => {
                bot.on('callback_query', (callbackQuery) => {
                  if (callbackQuery.data === 'next') {
                    resolve(true);
                  }
                });
              });
        
              if (!next) {
                break;
              }
            }
        
            await bot.sendMessage(chatId,
              `End of The Annuncements!
              \n
              \n
              \n use the following commands
              \n Welcome back to ASTU IF Telegram bot. 
              \n Use the following commands to navigate more :
              \n/start => First page
              \n/latest => Latest posts
              \n/dep => Department posts
              \n/school => School posts`);

          } catch (err) {
            console.error(err);
            return bot.sendMessage(chatId, 'Internal Server Error');
          }
        }
        else if (love === '/dep') {
            try {
              const departments = await Department.findAll();
              if (!departments || !departments.length) {
                return bot.sendMessage(chatId, 'No department found');
              }

              const handleDepartmentSelection = async (query, remainingDepartments) => {
                const selectedDep = query.data.replace('/', '');
                if (chatId === query.from.id) {
                  const response = `/${selectedDep}`;
                  // resend the response as a bot command to the bot
                  const botCommand = response;
                  if (botCommand.startsWith('/')) {
                    const args = botCommand.split(' ');
                    const command = args.shift().toLowerCase().substring(1);
                    const message = args.join(' ');
                    bot.emit('message', { chat: { id: chatId }, text: botCommand, command, args, message });
                  } else {
                    await bot.sendMessage(chatId, response);
                  }
                  try {
                    await bot.deleteMessage(chatId, messageId);
                  } catch (error) {
                    console.log('Error deleting message:', error.message);
                  }
                  // Remove the previous department selection options
                  const removeOptions = {
                    reply_markup: {
                      remove_keyboard: true
                    }
                  };
                  await bot.editMessageReplyMarkup(removeOptions, { chat_id: chatId, message_id: query.message.message_id });
              
                  if (selectedDep === 'more') {
                    // Show the next 5 departments
                    const moreOptions = {
                      reply_markup: {
                        inline_keyboard: [
                          ...remainingDepartments.slice(0, 5).map(dep => {
                            const abbreviation = dep.name
                              .split(' ')
                              .reduce((abbr, word) => {
                                if (['of', 'and'].includes(word.toLowerCase())) {
                                  return abbr;
                                }
                                return abbr + word[0].toUpperCase();
                              }, '');
                            return [{ text: abbreviation, callback_data: `/${abbreviation}` }];
                          }),
                          remainingDepartments.length > 5 ? [{ text: 'More', callback_data: 'more' }] : []
                        ]
                      }
                    };
                    await bot.sendMessage(chatId, 'Choose a department:', moreOptions);
                    remainingDepartments = remainingDepartments.slice(5);
                    bot.once('callback_query', query => handleDepartmentSelection(query, remainingDepartments));
                  } else if (remainingDepartments && remainingDepartments.length && remainingDepartments.length <= 5 && selectedDep === !'more') {
                    // Show the remaining departments
                    const moreOptions = {
                      reply_markup: {
                        inline_keyboard: [
                          ...remainingDepartments.map(dep => {
                            const abbreviation = dep.name
                              .split(' ')
                              .reduce((abbr, word) => {
                                if (['of', 'and'].includes(word.toLowerCase())) {
                                  return abbr;
                                }
                                return abbr + word[0].toUpperCase();
                              }, '');
                            return [{ text: abbreviation, callback_data: `/${abbreviation}` }];
                          })
                        ]
                      }
                    };
                    await bot.sendMessage(chatId, 'Choose a department:', moreOptions);
                    bot.off('callback_query', handleDepartmentSelection);
                  } else if (!remainingDepartments) {
                    // do nothing when there are no remaining departments
                  }
                } else {
                  await bot.sendMessage(chatId, "Sorry, I can't respond to other bots.");
                }
              };
              
              const options = {
                reply_markup: {
                  inline_keyboard: [
                    ...departments.slice(0, 5).map(dep => {
                      const abbreviation = dep.name
                        .split(' ')
                        .reduce((abbr, word) => {
                          if (['of', 'and'].includes(word.toLowerCase())) {
                            return abbr;
                          }
                          return abbr + word[0].toUpperCase();
                        }, '');
                      return [{ text: abbreviation, callback_data: `/${abbreviation}` }];
                    }),
                    departments.length > 5 ? [{ text: 'More', callback_data: 'more' }] : []
                  ]
                }
              };

              await bot.sendMessage(chatId, 'Choose a department:', options);
              
              if (departments.length > 5) {
                const remainingDepartments = departments.slice(5);
                bot.once('callback_query', query => handleDepartmentSelection(query, remainingDepartments));
              } else {
                bot.once('callback_query', query => handleDepartmentSelection(query, null));
              }
              
              
                } catch (err) {
                  console.error(err);
                  return bot.sendMessage(chatId, 'Internal Server Error');
                }
        }
        else if (love === '/school') {
            try {
              const schools = await School.findAll();
              if (!schools || !schools.length) {
                return bot.sendMessage(chatId, 'No schools found');
              }
              const options = {
                reply_markup: {
                  inline_keyboard: schools.map(school => {
                    const abbreviation = school.name
                      .split(' ')
                      .reduce((abbr, word) => {
                        if (['and'].includes(word.toLowerCase())) {
                          return abbr;
                        }
                        return abbr + word[0].toUpperCase();
                      }, '');
                    return [{ text: abbreviation, callback_data: school.schoolId.toString() }];
                  })
                }
              };
              await bot.sendMessage(chatId, 'Choose a school:', options);
          
              const handleSchoolSelection = async (query) => {
                const button = query.message.reply_markup.inline_keyboard.flat().find(b => b.callback_data === query.data);
                if (!button) {
                  await bot.sendMessage(chatId, 'Button not found.');
                } else {
                  const buttonName = '/' + button.text;
                  // resend the response as a bot command to the bot
                  const botCommand = buttonName;
                  if (botCommand.startsWith('/')) {
                    const args = botCommand.split(' ');
                    const command = args.shift().toLowerCase().substring(1);
                    const message = args.join(' ');
                    bot.emit('message', { chat: { id: chatId }, text: botCommand, command, args, message });
                  } else {
                    await bot.sendMessage(chatId, buttonName);
                  }
                }
                // remove the event listener after sending the response message
                bot.off('callback_query', handleSchoolSelection);
              };
              
              

              
              // add the event listener for the school selection
              bot.on('callback_query', handleSchoolSelection);
            } catch (err) {
              console.error(err);
              return bot.sendMessage(chatId, 'Internal Server Error');
            }
        }
        else{
            const command= love;
              if (command.startsWith('/')) {
              const id = command.substring(1).toUpperCase();
              const categories = await Category.findOne({where:{name:id}});
              if (categories) {
                let offset = 0;
                let posts = await Post.findAll({
                  order: [['createdAt', 'DESC']],
                  limit: 5,
                  offset: offset,
                  where: { categoryId: categories.categoryId },
                });
              
                if (!posts || !posts.length) {
                  return bot.sendMessage(chatId, `No post found
                      \n \n Welcome back to ASTU IF Telegram bot. \n Use the following commands to navigate more :
                      \n\n/start => First page
                      \n/latest => Latest posts
                      \n/dep => Department posts
                      \n/school => School posts`);
                }
              
                while (posts.length > 0) {
                  for (const post of posts) {
                    const message = `Staff Name: ${post.staffName}\nContent: ${post.content}\nDate: ${post.createdAt}`;
                    await bot.sendMessage(chatId, message);
                  }
              
                  offset += 5;
                  posts = await Post.findAll({
                    order: [['createdAt', 'DESC']],
                    limit: 5,
                    offset: offset,
                    where: { categoryId: categories.categoryId },
                  });
              
                  if (!posts || !posts.length) {
                    break;
                  }
              
                  await bot.sendMessage(chatId, 'Click the button below to retrieve the next 5 posts', {
                    reply_markup: {
                      inline_keyboard: [
                        [{ text: 'Next', callback_data: 'next' }],
                      ],
                    },
                  });
              
                  const next = await new Promise((resolve) => {
                    bot.on('callback_query', (callbackQuery) => {
                      if (callbackQuery.data === 'next') {
                        resolve(true);
                      }
                    });
                  });
              
                  if (!next) {
                    break;
                  }
                }
              
                await bot.sendMessage(chatId,
                  `End of The Annuncements!
                  \n
                  \n
                  \n use the following commands
                  \n Welcome back to ASTU IF Telegram bot. 
                  \n Use the following commands to navigate more :
                  \n/start => First page
                  \n/latest => Latest posts
                  \n/dep => Department posts
                  \n/school => School posts`);
              }
              
              }
          else{
            bot.sendMessage(chatId, 'Sorry, I don\'t understand this command.');
          }
        }
    }
    else{
      bot.sendMessage(chatId, 'Sorry, we dont support this file format here!.');
    }
});