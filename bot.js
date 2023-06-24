const TelegramBot = require('node-telegram-bot-api');
const {Post, Department, School, Category } = require('../back/models/schema')
const TOKEN='6296741047:AAG0I8v8quocr9Ja5T85suavIfKFGpnNpfs';
const bot = new TelegramBot(TOKEN, {polling: true});

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    if (msg.text==='/start') {
      const options = {
        reply_markup: {
          keyboard: [
            [{ text: '/start' }],
            [{ text: '/latest' }],
            [{ text: '/dep' }],
            [{ text: '/school' }]
          ],
          resize_keyboard: false,
          one_time_keyboard: true
        }
      };
    
      await bot.sendMessage(chatId, `Welcome to ASTU IF Telegram bot.`, options);
    }    
    else if(msg.text){
        const love =msg.text.toLowerCase();
        console.log(msg.text)
        if (love === '/latest') {
          try {
            let offset = 0;
            posts = await Post.findAll({
              attributes: ['postId', 'content'],
              order: [['createdAt', 'DESC']],
              limit: 5,
              offset: offset,
            });
            
        
            if (!posts || !posts.length) {
              return bot.sendMessage(chatId, ` No post found. \n \n \n use the following command. 
              \n /start     =>    first page 
              \n /latest    =>    for latest posts
              \n /dep       =>    for departement posts
              \n /school  =>    for school posts`);
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
              `No More!
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
                // Resend the response as a bot command to the bot
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
                          const abbreviation = dep.ShortedName
                            .split(' ')
                            .reduce((abbr, word) => {
                              if (['of', 'and'].includes(word.toLowerCase())) {
                                return abbr;
                              }
                              return abbr + word.toUpperCase();
                            }, '');
                          return [{ text: abbreviation, callback_data: `/${abbreviation}` }];
                        }),
                        remainingDepartments.length > 5 ? [{ text: 'More', callback_data: 'more' }] : []
                      ]
                    }
                  };
                  // Remove the "Choose a department:" message
                  await bot.deleteMessage(chatId, query.message.message_id);
                  await bot.sendMessage(chatId, 'Choose a department:', moreOptions);
                  remainingDepartments = remainingDepartments.slice(5);
                  bot.once('callback_query', query => handleDepartmentSelection(query, remainingDepartments));
                  return; // Break out of the function after handling 'more'
                }
        
                // Remove the "Choose a department:" message
                await bot.deleteMessage(chatId, query.message.message_id);
                // Do nothing when a department is selected
              } else {
                await bot.sendMessage(chatId, "Sorry, I can't respond to other bots.");
              }
            };
        
            const options = {
              reply_markup: {
                inline_keyboard: [
                  ...departments.slice(0, 5).map(dep => {
                    const abbreviation = dep.ShortedName
                      .split(' ')
                      .reduce((abbr, word) => {
                        if (['of', 'and'].includes(word.toLowerCase())) {
                          return abbr;
                        }
                        return abbr + word.toUpperCase();
                      }, '');
                    return [{ text: abbreviation, callback_data: `/${abbreviation}` }];
                  }),
                  departments.length > 5 ? [{ text: 'More', callback_data: 'more' }] : []
                ] 
              }
            };
        
            await bot.sendMessage(chatId, 'Choose a department:', options);
        
            if (departments.length > 5) {
              let remainingDepartments = departments.slice(5);
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
            let offset = 0; // Variable to track the offset for pagination
            const limit = 5; // Number of schools to display per page
        
            const fetchSchools = async () => {
              const schools = await School.findAll({ offset, limit });
              if (!schools || !schools.length) {
                return bot.sendMessage(chatId, `No schools found. \n \n \n use the following command. 
                \n /start     =>    first page 
                \n /latest    =>    for latest posts
                \n /dep       =>    for department posts
                \n /school    =>    for school posts`);
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
        
              // Add the "Next" button if there are more schools to display
              if (offset + limit < schools.length) {
                options.reply_markup.inline_keyboard.push([
                  { text: 'Next', callback_data: 'next' }
                ]);
              }
        
              await bot.sendMessage(chatId, 'Choose a school:', options);
            };
        
            const handleSchoolSelection = async (query) => {
              const button = query.message.reply_markup.inline_keyboard.flat().find(b => b.callback_data === query.data);
              if (!button) {
                await bot.sendMessage(chatId, 'Button not found.');
              } else {
                const buttonName = '/' + button.text;
                // Resend the response as a bot command to the bot
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
              // Remove the "Choose a school:" message
              await bot.deleteMessage(chatId, query.message.message_id);
              // Remove the event listener after sending the response message
              bot.off('callback_query', handleSchoolSelection);
            };
        
            const handleCallbackQuery = async (query) => {
              if (query.data === 'next') {
                offset += limit; // Increase the offset for the next page
                await fetchSchools();
              }
            };
        
            // Add the event listener for the school selection
            bot.on('callback_query', handleSchoolSelection);
        
            // Add the event listener for the "Next" button and other callback queries
            bot.on('callback_query', handleCallbackQuery);
        
            // Initial fetching of schools
            await fetchSchools();
          } catch (err) {
            console.error(err);
            return bot.sendMessage(chatId, 'Internal Server Error');
          }
        }
        
        else {
          const command = love;
          if (command.startsWith('//') || command.startsWith('///') || command.startsWith('////') || command.startsWith('/////')) {
            bot.sendMessage(chatId, 'Sorry, we don\'t support this file format here!');
          } else if (command.startsWith('/')) {
            const id = command.substring(1).toUpperCase();
            console.log(id);
            const categories = await Category.findOne({ where: { name: id } });
            if (categories) {
              let offset = 0;
              let posts = await Post.findAll({
                
                attributes: ['postId', 'content'],
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
        
              let lastMessageId = null;
        
              while (posts.length > 0) {
                for (const post of posts) {
                  const message = `Staff Name: ${post.staffName}\nContent: ${post.content}\nDate: ${post.createdAt}`;
                  const sentMessage = await bot.sendMessage(chatId, message);
                  lastMessageId = sentMessage.message_id;
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
        
                // Delete previous messages
                if (lastMessageId) {
                  await bot.deleteMessage(chatId, lastMessageId);
                  lastMessageId = null;
                }
        
                if (!next) {
                  break;
                }
              }
        
              // Delete last message
              if (lastMessageId) {
                await bot.deleteMessage(chatId, lastMessageId);
              }
        
              await bot.sendMessage(chatId, `End of The Announcements!
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
          } else {
            bot.sendMessage(chatId, "Sorry, I don't understand this command.");
          }
        }
    } 
    else{
      bot.sendMessage(chatId, 'Sorry, we dont support this file format here!.');
    }
});
  