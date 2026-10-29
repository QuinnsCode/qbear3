// @/app/components/Blog/BlogServer.tsx
// Async server component — fetches/provides post data
// Swap hardcoded POSTS for a db query later:
//   const posts = await db.blogPost.findMany({ orderBy: { publishedAt: 'desc' } })

import { BlogBoundary } from "./BlogBoundary";

export type BlogPost = {
  id: string;
  title: string;
  author: string;
  publishedAt: string;
  tag: string;
  preview: string;
  content: string;
};

const POSTS: BlogPost[] = [
  {
    id: '002',
    title: 'A love letter to RedwoodJS, now CedarJS',
    author: 'Ryan Quinn',
    publishedAt: '2026-03-22T10:00:00Z',
    tag: 'devlog',
    preview: 'Some tech you babysit. This one just runs. A love letter to RedwoodJS and CedarJS. The edge is fast, change is slow.',
    content: `Some tech you babysit. This one just runs. A love letter to RedwoodJS and CedarJS. The edge is fast, change is slow. Too many ppl chase bleeding-edge... I am one of those people in sometimes. I can admit that haha. HOWEVER, I also think of myself as: sensible, pragmatic, constraint-aware. Try to find happy paths that make future Ryan not hate his life.

Maybe it is Stockholm syndrome, but I have no desire to change off the setup I have currently for some of these apps. Especially for one particular giant CedarJS app I have had in production for what seems like half a decade at this point.

Let's rewind history. About five years ago. I found RedwoodJS. I was making an app for my workplace. I knew Shopify was a major integration point. I knew I could use Ruby on Rails, maybe Python to integrate with Shopify, but they also had GraphQL. This could maybe allow me a nice way to make a whole JS or TS app for this. I had slowly come to the darkside and joined the JS/TS takeover of the server to the chagrin of so many sys admins. RedwoodJS had a vision I resonated with: the Rails of JavaScript. I am also 1000000% biased having lived in Santa Cruz, CA and literally being amongst gorgeous Redwood forest of the Ewoks combined with the climate mission. Opinionated full-stack, sensible defaults, GraphQL baked in, Prisma for the DB's ORM is abstraction tax but does allow hopping around easily, React for the front, trying to be serverless. It tried to do for JS what Rails did for Ruby... give the ADD-prone ecosystem a single happy path.

But like so many attempts before it, it was not what they wanted. It failed to be it's full bloom. The JavaScript crowd has an inability to accept a "just use this" answer for better and for worse haha. Custom setups, strong opinions about the one true bundler, the one true state manager, too much identity wrapped up in the stack choices. Rails worked because the Ruby community accepted the rails. The JS community does not accept rails. They build their own rails and then blog about why their rails are better *looks around*.

RedwoodJS split into two children. I am not sure whether they'd frame it that way or not; those are my words. You now have CedarJS, which I call the physical successor to RedwoodJS; the GraphQL + Prisma + React lineage. Then there is RWSDK (RedwoodSDK); all-in on React Server Components and Cloudflare stack I call the spiritual successor because it feels. Two very different bets. I use both, for different things, and I think that's the right answer. I don't need to drop older proven tech. I don't need to drop newer tech because I don't want to bleed a little.

I have many CedarJS apps. The biggest handles a huge part of productivity enhancements for the laser engraving operation / management. Order pipelines, job processing, Shopify integration. I have whole apps within that app. Many of these are definitely more of a client app. Small in user headcount relative to a big company, but can be real real real volume in sales hours like after work and weekends during Black Friday, Christmas and other holidays while also handling internal order lookup tools to process laser engravings. Real production work. Real money moving through it. Real consequences when it breaks.

So I obviously have a crazy setup for this after years of running it right? With some team members spread across the US now and even ppl in other countries? Here is what is actually running... I can explain it fast and easy. Vercel, Railway, Inngest handle 99% of the app (I have some R2 storage, a worker, and durable object from Cloudflare). That is it. And it has been fine.

Vercel for the app layer has Fluid Compute turned on. I get three regions the functions get deployed to. I just spread out across three US centers. Railway for the data layer: Postgres container, PG Bouncer add-on on top as a free add-on for connection pooling, and a Redis instance on top of that to try to have in memory kv speed to use trying to keep load off the db if I can fast return. If I ever need more headroom, Prisma Accelerate is a $10/month drop-in that buys another few factors of scale without touching a single query. I actually stripped it off because the simple setup has help up to my scales.

Mutations bust Redis related keys. Queries that don't need to be realtime — which is the vast majority of them — hit Redis first and never reach Postgres. Rate limiting lives in Redis too. Crons get handed to Inngest rather than running in-process. Inngest handles anything with unpredictable wall time: long-running jobs, slow third-party calls, AI inference. That combination means Postgres sees maybe 2% of the traffic it theoretically could. Supremely stable.

The bill: roughly $5 Railway, $20 Vercel Pro ( realistically subsidized across many projects), maybe $5 in other workers costs. Thirty dollars a month for connection pooling, Redis caching, async job processing, and multi-region compute for a real business processing real orders. Solid throughput. Could be better TTFB across more zones, but that is not what I needed to design.

I know what you want to say. Don't. I respect the $5 VPS... well I guess soon to be $7 VPS. We all get it. But tell me the engineering hours for your CI/CD pipeline, your Postgres failover, your Redis cluster management, your job queue implementation, your monitoring setup, your certificate rotation. Sometimes it is nice to hand that off until my scale matters more and guess what? It hasn't.

Know thy customer. Make sure to ask, "do I know my customer?". I think that most people skip that step. For me, users are on desktops or at least solid spec'd laptops capable of running engraving software and or editing software like Adobe Illustrator. Decent hardware, decent internet, mostly US-based though more and more internationals joining on, not remotely SEO-sensitive, mostly hitting the app during contained times (work hours). Now about the biggest app within the biggest app I have in now CedarJS. Our process that uses the app bottlenecks long before requests per second ever will, but I have tested this it's fast enough to be so many factors scaled up. The throughput ceiling I will hit in real life is a room full of people lined up at few machines taking a Photo Booth style photo, not a Postgres connection limit. Before going deeper into that part of the app lets finish off the CedarJS tech stack.

GraphQL stays important to this app because of the integration to Shopify. Shopify is a GraphQL API. When your entire commerce layer speaks GraphQL natively, having a GraphQL app is not a liability; it is a direct wire. No translation layer, no REST adapter, no impedance mismatch. The integration is clean because both sides are speaking the same language.

Now I know ppl will hate the GraphQL layer, but I must say it has made it VERY easy to move off the GraphQL hill vs getting back onto it. I did always like Theo of T3's views on GraphQL. It is very good when you have a backend team and a front end team that just sort of want to agree on the interface between them and then go back to doing their own thing. Now it can be verbose to write out the SDLs, the resolvers. However, I have found it so easy especially now with AI to hand it the Prisma schema + SDLs and that is enough to usually recreate whatever you need RPC or RSC server action.

The other honest reason CedarJS stays: it just works. SEO was never a concern for these apps. The client-side rendering that everyone wrings their hands about is completely fine for productivity tools where the user is authenticated and the app is their workspace. It is also just a nice experience once loaded in. Fine for apps you spend some time clicking all around in.

I do have RSC apps as well so I write components in a way that makes them moveable to RSC if I ever need/want to. I will write a separate article blog something about this along the lines of, "in the era of RSC, your client component should just be a hook".

So why write this now? Well parts of the app have actually been more and more used in at larger and larger events and actually getting real world out of office usages. So what actually pushed this stack to its limits? The last couple weeks have been the highest throughput this pipeline has ever seen, running in anticipation of an upcoming event. We are talking about a thousand people working through this process simultaneously, across multiple machines, compressed into a few hours.

CedarJS is RedwoodJS's physical successor. It is the same bones that have been holding production weight since before the rename for half a decade it seems since pre v1. I just changed the imports to @cedarjs and switched a package.json.

The lesson I keep relearning: do not pre-optimize. You're probably scaling solutions to the wrong problem. That causes MORE problems! Not less! haha. Know your users, know your constraints, ship the boring infrastructure, save the heroics for problems that actually show up.

CedarJS gave me a foundation that works. I am building on top of it, not burning it down to chase the new thing. (Don't mind me when I do, in fact, post later about bleeding-edge like the degenerate JS/TS dev I am haha. I can believe in both!).

Sometimes the tech just works. That is worth writing about.`,
  },
  {
    id: '001',
    title: "Introducing the QNTBR suite — what we've built and why",
    author: 'Ryan Quinn',
    publishedAt: '2026-03-14T09:00:00Z',
    tag: 'devlog',
    preview: 'QNTBR started as a virtual tabletop for Magic: The Gathering. It is now the umbrella for everything I build — a small suite of tools that each solve a real problem and dogfood each other.',
    content: `QNTBR started as a virtual tabletop for Magic: The Gathering Commander. It is now the name on the umbrella for everything I build. Not by grand plan — by the natural gravity of building tools you actually need.

QVTT is the virtual tabletop. Play Commander online with your pod. Real-time board sync, life tracking, commander damage, in-game calls. No accounts required for players — you share a link, they click it, they are in. The goal is to feel like sitting at a table, not like operating software.

Qlave is WebRTC audio and video, browser-native. It grew out of QVTT — every time I watched people open a separate app just to make a call during a game I knew it was wrong. Qlave is now embedded in QVTT so you never leave the app. The broader thesis is that calls should disappear into the workflow. One link, any device, no installs.

Flareup is infrastructure cost monitoring. I built it because I needed it. When you are running multiple apps across multiple services, your bill becomes a mystery. Flareup gives you spend visibility broken down by service, with alerts before the surprise. The goal is zero bill surprises.

Staticflare is coming soon. The pitch: if your TypeScript project has a build step, Staticflare can deploy the static output to the edge in one command. It handles the bucket, the CORS config, the DNS wiring — all the infrastructure plumbing that eats an afternoon every time you do it by hand. Your infrastructure, your account, automated setup.

All four products run under QNTBR. No separate companies, no funding, no grand strategy — just tools that needed to exist, built by someone who needed them. Each one is in production. Each one dogfoods the others. That is the whole model.

More posts coming. Building in public.`,
  },
];

export async function BlogServer() {
  const posts = POSTS;
  return <BlogBoundary posts={posts} />;
}