
## SWV3

****

This is the third iteration (complete rewrite) of my passion project, Sunwatch.

This particular rewrite is using the Remix.run framework, hosted and deployed via Cloudflare.


****

General data flow:

LocationComponent -> sends geolocation or input to index action function -> index action function redirects us to a specific URL based on our coordinates (we can also share this url to send people directly to a certain location!) -> index loader function take's this new URL and makes an API call to our weather provider (open-meteo) for the relevant data -> this data is converted through a complex, and probably broken function to get a rating based on the data

****

For previous versions, we fetched the weather data at the location entered by our user. V3 takes this to a new level with "zones".
There are 3 zones, each impacting our rating in *very* different ways.

Near zone; weather within 3 miles of our current location - this impacts ratings drastically because low clouds or fog here will completely block our view of a sunrise or sunset.


Horizon zone; weather around the horizon in the direction of the event (west for sunsets, east for sunrises) - this also impacts our rating heavily because clouds in this zone are responsible for the spectacular colors we sometime's see.


Far zone; weather past the horizon. - this is mostly a "bonus" to the rating, as it can add a sense of "drama" to the sky we view. Also low clouds in this area may prevent sunlight from reflecting correctly on the horizon zone clouds.

****

### TODO:


- [x] Picture submitting
- [x] Map view of submitted pictures
- [x] "Featued" submissions section
- [x] NSFW submission detection+rejection
- [ ] Historic data working properly
- [ ] Historic submissions working properly
- [ ] Integrate CF turnstile to verify submissions
- [ ] UI cleanup lol
- [ ] Code cleanup lol





****

My main goals are to meet, and exceed all previous verions.


Version 1 was a barebones proof of concept for my idea. It was made using plain JS to modify the DOM of the page. Along with this, I fetched our API on the client, so the client got the API key X_X


Version 2 was a much better verion. It enabled user submissions, more data visualization, and proxied API requests through a PHP backend.


Version 3 *will* be an even better verion. It uses the Remix framework- which gives us SSR, server side actions, and the ability to connect databases and the like.



