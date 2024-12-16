# Sunwatch

This is the third iteration of my passion project, Sunwatch. It's a rating calculator for the visual quality of sunrises and sunsets. I one shotted [the algorithm](https://github.com/jgray-dev/swv3/blob/main/app/.server/rating.ts) for this one night, and it's held up very well. This algorithm *will* change as i collect more data, view more sunsets, and get more feedback.

#### Technology stack:

- Remix/React (Main framework)
- TypeScript (Main language)
- Cloudflare (CDN, Image hosting, deployment, compute, database)
- Tailwind (Styling)


#### Third party providers:

- [Open Meteo](https://github.com/open-meteo/open-meteo) (Weather API)
- [Google Cloud](https://console.cloud.google.com) (Geocoding API)
- [Pigeon maps](https://pigeon-maps.js.org/) (User submission map)

####

### General UI view:
![General UI](https://raw.githubusercontent.com/jgray-dev/swv3/refs/heads/main/%7B2C51FC13-DED8-488E-8A5F-6CF8E8FBE37A%7D.png)


### View of a user submission:
![Submission View](https://raw.githubusercontent.com/jgray-dev/swv3/refs/heads/main/%7B53713914-D0E1-4584-8566-608015FA28FA%7D.png)


### Modal view of a selected submission:
![Modal View](https://raw.githubusercontent.com/jgray-dev/swv3/refs/heads/main/%7B1AE27F16-B0B6-4F43-88DC-3BFD66DACE6E%7D.png)


####

This is a publicly available website, and you can view it at [sunwat.ch](https://sunwat.ch/). User image submissions are very much welcome. :) If you find any issues, report them [here](https://sunwat.ch/contact) or open a github issue or PR fixing it
