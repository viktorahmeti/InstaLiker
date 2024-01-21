const puppeteer = require('puppeteer');
var readline = require('readline').promises;
const userAgentGenerator = require('random-useragent');

let browser;
let page;
let customHeaders = {};
let gotHeaders = false;

greet()
.then(launchBrowserAndPage)
.then(getCredentials)
.then(login)
.then(getTargetUserData)
.then(navigateToUserProfile)
.then(getPostIds)
.then(unlikeAllPosts)
.then(likeAllPosts)
.then(() => browser.close())
.catch((e) => {
  console.log(`An error occurred, try to figure it out:\n\n${e}`);
});

/**
 * A simple greeting
 */
async function greet(){
  let greetText = 
  `8888888                   888             888      d8b 888                       
  888                     888             888      Y8P 888                       
  888                     888             888          888                       
  888   88888b.  .d8888b  888888  8888b.  888      888 888  888  .d88b.  888d888 
  888   888 "88b 88K      888        "88b 888      888 888 .88P d8P  Y8b 888P"   
  888   888  888 "Y8888b. 888    .d888888 888      888 888888K  88888888 888     
  888   888  888      X88 Y88b.  888  888 888      888 888 "88b Y8b.     888     
8888888 888  888  88888P'  "Y888 "Y888888 88888888 888 888  888  "Y8888  888     
                                                                                 
                                                                                 
                                                                                 `
  console.log(greetText);
}
/**
 * Function to get the user credentials from the command line
 */
function getCredentials(){
  console.log('-----Please log in using your Instagram credentials-----');

  let username, password;

  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return rl.question('Username: ')
  .then(usr => {username = usr; return rl.question('Password: ')})
  .then(pass => {password = pass; rl.close(); return [username, password]});
}

/**
 * Get the username and user id of the other user
 */
async function getTargetUserData(){
  console.log('-----Please provide the data for the OTHER user-----');

  let targetUsername, targetUserId;

  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

    // .then(target => {targetUser = target; return rl.question('What is the user\'s Instagram id? (You can find it here https://commentpicker.com/instagram-user-id.php): ')})
  // .then(targetId => {targetUserId = targetId; rl.close(); return [username, password, targetUser, targetUserId]});

  return rl.question('What is the other user\'s username: ')
  .then((username) => {targetUsername = username; return rl.question('What is the user\'s Instagram id? (You can find it here https://commentpicker.com/instagram-user-id.php): ')})
  .then(targetId => {targetUserId = targetId; rl.close(); return [targetUsername, targetUserId]});
}

/**
 * Logs the user into instagram and redirects to the profile page
 */
async function login([username, password]){
  let usernameSelector = "input[type=\"text\"]";
  let passwordSelector = "input[type=\"password\"]";
  let submitButtonSelector = "button[type=\"submit\"]";

  // Navigate to Instagram's login page
  await page.goto('https://www.instagram.com/accounts/login/', {waitUntil: 'networkidle2'});

  await page.type(usernameSelector, username);
  await page.type(passwordSelector, password);

  let submitButton = await page.$(submitButtonSelector);

  await page.evaluate((sB) => {
    sB.removeAttribute("disabled");
  }, submitButton);

  await submitButton.click();

  await page.waitForNavigation();

  console.log(`Logged into account ${username}\n\n`);
}

/**
 * Launches the browser and creates a new tab
 */
async function launchBrowserAndPage(){
  const randomUserAgent = userAgentGenerator.getRandom(function (ua) {
    return parseFloat(ua.browserVersion) >= 20 && ua.browserName === 'Firefox';
  });

  browser = await puppeteer.launch({args: [`--user-agent=${randomUserAgent}`]});
  page = await browser.newPage();
}

/**
 * Navigates to the target user's profile
 */
async function navigateToUserProfile([targetUsername, targetUserId]){
  configureRequestInterception();

  await page.goto(`https://www.instagram.com/${targetUsername}/`, {waitUntil: 'networkidle0'});

  console.log(`Navigated to profile ${targetUsername} \n\n`);

  return targetUserId;
}

/**
 * Configures a sneaky interceptor to steal some important headers
 */
function configureRequestInterception(){
  page.setRequestInterception(true);
  page.on('request', interceptedRequest => {
    if (interceptedRequest.isInterceptResolutionHandled()) return;

    if(!gotHeaders && (interceptedRequest.url().endsWith('ig_sso_users/'))){
        customHeaders['x-asbd-id'] = interceptedRequest.headers()['x-asbd-id'];
        customHeaders['x-csrftoken'] = interceptedRequest.headers()['x-csrftoken'];
        customHeaders['x-ig-app-id'] = interceptedRequest.headers()['x-ig-app-id'];
        customHeaders['x-ig-www-claim'] = interceptedRequest.headers()['x-ig-www-claim'];
        customHeaders['x-instagram-ajax'] = interceptedRequest.headers()['x-instagram-ajax'];
        customHeaders['x-requested-with'] = interceptedRequest.headers()['x-requested-with'];
        gotHeaders = true;
    }

    interceptedRequest.continue({}, 0);
  });
}

/**
 * Get an array with the ids of all the posts of the user
 */
async function getPostIds(targetUserId){
  let mediaIds = await page.evaluate(async (hd, usrId) => {
    let mediaIds = [];
    let nextMaxId;
    let moreAvailable = true;
    let requestUrl = `https://www.instagram.com/api/v1/feed/user/${usrId}?count=12`;

    while(moreAvailable){
        if(nextMaxId)
            requestUrl += `&max_id=${nextMaxId}`;

        let raw = await fetch(requestUrl, {method: 'GET', headers: hd})
        let data = await raw.json();
    
        nextMaxId = data.next_max_id;
        moreAvailable = data.more_available;

        data.items.forEach((item) => mediaIds.push(item.id));
    }

    return mediaIds;
  }, customHeaders, targetUserId);

  console.log(`Successfully retrieved ${mediaIds.length} posts`);

  return mediaIds;
}

/**
 * Unlikes all of the user's posts
 */
async function unlikeAllPosts(mediaIds){
  await page.evaluate((ids, hd) => {
    return Promise.all(ids.map((id) => {
        return fetch(`https://www.instagram.com/api/v1/web/likes/${id.split('_')[0]}/unlike/`, {method: 'POST', headers: hd});
    }));
  }, mediaIds, customHeaders);

  console.log(`Successfully UNLIKED ${mediaIds.length} posts`);

  return mediaIds;
}

/**
 * Likes all of the user's posts
 */
async function likeAllPosts(mediaIds){
  await page.evaluate((ids, hd) => {
    return Promise.all(ids.map((id) => {
        return fetch(`https://www.instagram.com/api/v1/web/likes/${id.split('_')[0]}/like/`, {method: 'POST', headers: hd});
    }));
  }, mediaIds, customHeaders);

  console.log(`Successfully LIKED ${mediaIds.length} posts`);

  return mediaIds;
}
