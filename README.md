# InstaLiker

A zero-configuration script for liking another user's Instagram posts. Simply provide your Instagram login credentials 
(which we will definitely not steal) and the other user's username and you're good to go. Your account will be safe from being banned by the Instagram algorithms as long as you don't overuse this program.

## For users
Using this program is very straightforward:
1. Make sure you have Node >= 17 on your machine
2. Clone this repo
3. Disable Two-Factor authentication on your Instagram account
4. Make sure you either follow the other user or they have a public account
5. `npm install`
6. `npm start`

You will be prompted to write your username and password, and upon successful login, write the data for the other user. Wait a few seconds and you will get a confirmation that the likes were sent. If not, just wait for the other guy to call you asking why in the world you would like their pictures from 2017.

## For developers
This is not a good program. I mean, it's a really bad program. I doesn't use the Graph API for the simple reason that authentication and authorization takes a lot of work on the side of the user.  
This script actually starts a headless Chromium browser and navigates directly to the user's profile. Now, by stealing some headers from normal requests, we are able to mimic the running application and call any API we want. The program uses the v1 API to get a list of all the user's posts. This list is paginated so we make many calls until we get to the end of them. After this it's just a matter of making POST requests to first unlike all the posts and then like all of them again.  
The reason for unliking the posts first is that we want our friend to get 1000 notifications instead of just 10 from the posts you forgot to like.  
Instagram is smart in blocking such weird usage of their APIs so a random user-agent is generated with each run of the program. *Have Fun*.
