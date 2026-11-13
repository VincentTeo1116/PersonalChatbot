import type { ArticleFigureId } from "@/components/ArticleFigure";

export type EngineeringArticle = {
  slug: string;
  title: string;
  description: string;
  published: string;
  updated: string;
  /** Paragraphs may contain links written as [text](https://... or /path). A section can end with one chart from components/ArticleFigure.tsx. */
  sections: { id: string; title: string; paragraphs: string[]; figure?: { id: ArticleFigureId; caption: string } }[];
  /** The case study or demo this article is about, shown first in the links under the article. Defaults to the chatbot case study. */
  related?: { href: string; label: string };
  /** Not published yet: visible when running the site locally, hidden on the live site (pages, lists, sitemap). Remove the line to publish, and set both dates to that day. */
  draft?: boolean;
};

// Original implementation notes. Update the dates when the text materially changes.
// Results are deliberately described only when measurements are available.
const allArticles: EngineeringArticle[] = [
  {
    slug: "supabase-rag-knowledge-sync",
    title: "Keeping a RAG portfolio assistant in sync with Supabase",
    description: "How this portfolio connects Supabase, Gemini embeddings, Pinecone, and Groq, including content updates, stale vectors, and cache limitations.",
    published: "2026-10-26",
    updated: "2026-10-26",
    sections: [
      { id: "shared-content", title: "Start with the same content source", paragraphs: [
        "This portfolio has two ways to explore the same background: a website and an AI assistant. Maintaining a separate copy of the content for each creates a freshness problem. A project can appear on the website while the assistant continues to answer from an older description.",
        "The implementation reads the public portfolio tables in Supabase for both uses. Next.js renders the website from those records. A FastAPI service turns the records into question-and-answer entries for retrieval. The data includes the profile, education, work experience, projects, research, and final year project. Visitor messages and meeting requests are excluded from this knowledge base.",
      ] },
      { id: "update-flow", title: "What happens after an edit", paragraphs: [
        "After a successful project save, a Next.js server action schedules a sync with after(). The visitor-facing save response does not have to wait for embedding requests. The backend webhook checks a shared secret before reading the content tables and generating new vectors.",
        "Each knowledge entry has an ID derived from its category and question. Editing the answer updates the existing vector. Renaming a project can change its generated question and therefore its ID. The sync removes IDs absent from the new content set, so deleted or renamed entries do not remain indefinitely in retrieval results.",
        "The route refuses to sync an empty content set, and a failed Supabase read aborts before cleanup. These checks matter because deleting every vector after a failed read would turn a temporary content error into an empty knowledge base.",
      ] },
      { id: "retrieval", title: "Keep the retrieval units useful", paragraphs: [
        "Short portfolio entries are embedded as complete records using Gemini. Longer case studies are separated into their named sections, each carrying a link to the corresponding heading. That gives a question about limitations a more specific source than one vector representing the entire project.",
        "At question time, the backend embeds the query, asks Pinecone for nearby entries, applies a similarity threshold, and sends the retrieved context to Groq. The widget streams the answer and displays supporting links. A source link helps a visitor inspect the evidence; it does not prove that every generated claim is supported.",
      ] },
      { id: "tradeoffs", title: "Tradeoffs I would measure next", paragraphs: [
        "The current sync re-embeds the content on each run. This is easy to follow for a small portfolio, but a growing knowledge base would benefit from comparing content hashes and updating only changed entries. Concurrent sync jobs also deserve explicit coordination before scaling the service.",
        "Answers use an in-memory cache, which is cleared by the process handling a successful sync. A deployment with multiple workers would need shared invalidation or versioned cache keys to keep every worker current. The update process is also not a transactional switch between complete index versions; an interrupted sync can require a retry.",
        "The useful next measurements are sync duration, embedding requests per edit, retrieval quality after an update, and the time until changed content appears in an answer. These are proposed measurements, not published benchmark results.",
      ] },
    ],
  },
  {
    slug: "evaluating-portfolio-rag-retrieval",
    title: "Evaluating RAG retrieval with hit rate and reciprocal rank",
    description: "A practical explanation of this portfolio's 20-question retrieval check, what hit@1 and MRR measure, and why answer quality needs separate evaluation.",
    published: "2026-10-26",
    updated: "2026-10-26",
    sections: [
      { id: "questions", title: "Define what should be retrieved", paragraphs: [
        "The repository includes a retrieval evaluation script with 20 questions about awards, research, education, tools, work experience, and individual projects. Each question has an expected substring in a metadata field, such as a project name or the Research category.",
        "The script uses the same retrieval service as the chatbot and requests the six highest-ranked matches. It then finds the first result whose selected metadata field contains the expected substring. This makes the check reproducible, while keeping the expected answers understandable enough to inspect manually.",
      ] },
      { id: "metrics", title: "Read the three reported metrics", paragraphs: [
        "Hit@1 counts questions for which the expected entry appears first. Hit@3 counts those where it appears within the first three results. Mean reciprocal rank averages one divided by the rank of the first expected match; a question without a match contributes zero. For example, an expected entry at rank two contributes 0.5 to that question's reciprocal rank.",
        "These measures answer different practical questions. Hit@1 describes whether the best result is usually useful. Hit@3 describes whether relevant evidence is available near the top. Reciprocal rank distinguishes finding the expected entry immediately from finding it lower in the list.",
      ] },
      { id: "limitations", title: "Know what this check cannot establish", paragraphs: [
        "The script inspects retrieval before the chat route's similarity cutoff. It therefore does not measure whether the production route would retain each expected match. A useful follow-up evaluation would report both retrieval rank and the answerable-question rate after the configured cutoff.",
        "A category match can also be generous: a Skills entry may satisfy the label check while omitting the particular skill the question asks about. A stronger test set would identify the supporting fact or exact source, and would include questions that have no supported answer.",
        "Finally, relevant context can still lead to an incomplete or unsupported generated answer. Retrieval scores should be reported alongside a separate review of factual support, citation relevance, appropriate abstention, and the final answer's usefulness. The presence of a source is not a calibrated probability that the response is correct.",
      ] },
      { id: "experiments", title: "Make comparisons reproducible", paragraphs: [
        "To compare an embedding or preprocessing change, hold the questions and knowledge-base snapshot constant. Record the embedding model, namespace, retrieval depth, cutoff, and evaluation date. The existing script can compare query name stripping with raw queries, but the indexed document preprocessing must also be documented for that comparison to be interpretable.",
        "A future report should include individual failures and a separate held-out set of paraphrases. Questions about missing experience, ambiguous project references, and multilingual input are useful additions. Latency should be measured independently, with cached and uncached requests identified.",
        "This article explains the implemented evaluation method. A numerical benchmark has not been published here yet; any future score should be accompanied by its test set and configuration so readers can assess what it actually demonstrates.",
      ] },
    ],
  },
  {
    slug: "forecasting-rapid-kl-ridership",
    title: "I built a forecast for how crowded the LRT and MRT will be",
    description: "How I used Malaysia's open ridership data and XGBoost to forecast Rapid KL passenger numbers 28 days ahead, what worked, what did not, and how it updates itself every night.",
    published: "2026-11-13",
    updated: "2026-11-13",
    related: { href: "/projects/rapid-kl-ridership-forecast", label: "Rapid KL forecast case study" },
    sections: [
      { id: "why", title: "Why I wanted this", paragraphs: [
        "I don't drive much. Work, class, shopping, meeting friends: most of it happens by LRT or MRT, and with a monthly pass it is cheaper and honestly less stressful than sitting in a jam.",
        "The one thing that ruins it is a packed train. A concert night, the week before Raya, a rainy evening when everybody gives up on their motorbike. Some days you tap in and regret it straight away. So the question I wanted answered was simple: which day is the better day to go out?",
        "The idea came from a group assignment. My teammates and I predicted road traffic in Victoria, Australia, from SCATS sensor data, using XGBoost, Random Forest and a bit of reinforcement learning. I enjoyed that more than I expected. The problem was that it only scored itself on days that had already happened, in a city I have never been to. I wanted one that says something about next week, here.",
      ] },
      { id: "data", title: "The data, and the first disappointment", paragraphs: [
        "Malaysia publishes this, which surprised me. On [data.gov.my](https://data.gov.my/data-catalogue/ridership_od_rapidrail_daily) you can download how many trips were made between every pair of Rapid Rail stations, every day since January 2023, and it is refreshed daily.",
        "I wanted an hourly forecast, because \"is 6pm worse than 8pm\" is the question a commuter actually has. That data is not published. Only daily totals are, and I was not going to invent an hourly pattern and pretend it was real. So the forecast is daily. I do plan to ask for hourly figures, and if they ever appear this gets a lot more useful.",
        "From those files I built 174 series: the whole network, the 7 lines, and 166 stations. One note if you compare with official numbers: I count each journey once, at the station where it starts. Prasarana's line figures also count people changing lines, so theirs are higher.",
      ] },
      { id: "usual-day", title: "The trick: don't predict the number", paragraphs: [
        "A normal weekday on the network is around 700,000 entries. A Sunday is closer to 400,000. If you ask a model to predict those raw numbers, it spends most of its effort relearning that Sundays are quiet.",
        "So I gave it an easier job. For every series I work out the usual level for that weekday from the recent weeks, skipping public holidays and odd days like a station closure. The model only predicts how far above or below usual a day will be, as a percentage. That way a small station and KLCC can share one model, and \"Raya week is much quieter than usual\" is something it can learn once and apply everywhere.",
        "What it gets to look at is only what you would know on the day you make the forecast: the weekday and month, public holidays and the days around them, Ramadan, how far away Raya and Chinese New Year are, and how that series has been doing lately and at the same time last year.",
      ] },
      { id: "results", title: "Did it work?", paragraphs: [
        "I tested it on a full year it had never seen, 12 November 2025 to 11 November 2026, and I made it compete against two lazy guesses: \"same as this weekday last week\" and \"just the usual level\". If a model can't beat those, it has no business being on my site.",
        "For the whole network the model was off by 4.2% on average. The usual level was off by 6.3%, and last week by 8.9%.",
        "Here is the part I did not expect. On ordinary days the model barely wins: 3.6% against 3.8%. An ordinary Tuesday looks like the last few Tuesdays, and no amount of machine learning changes that. Nearly all of the gain comes from holiday periods, where the lazy guess is off by 28% and the model by under 10%. Which is fine, because those are exactly the days I wanted to know about.",
        "It also holds up with distance. One day ahead it is off by 3.7%, and 28 days ahead by 4.8%.",
      ], figure: { id: "rapidkl-error-by-day-type", caption: "Average error as a share of ridership, whole network, on the unseen test year. Shorter is better. The model is the orange bar." } },
      { id: "did-not-work", title: "Things I tried that did not help", paragraphs: [
        "I am listing these because the failures taught me more than the wins.",
        "School holidays. I was sure these would matter. I added the school calendar, tested on two different periods, and the result went up in one and down in the other. Out it went.",
        "Telling the model to care more about holidays. I gave holiday days extra weight in training. It got worse on exactly the days it was meant to help.",
        "Rain. This one hurt a little. With the day's actual rainfall the network error dropped by about 5%. But that is cheating: I won't know next Friday's real rainfall next Friday morning, only a forecast of it. Until I test it with real weather forecasts, it stays out.",
        "Concerts and events. This is the one I personally care about most, and I could not find a reliable list of events to learn from. So today the model does not know Bukit Jalil has a concert on. I would rather say that plainly than have you trust it on a concert night.",
        "The shaded range on the chart was also wrong at first. It was supposed to contain the real number 8 times out of 10, and when I checked, it managed about 6. I had to widen it using days the model had not seen, and now it lands at 77% to 79%.",
      ] },
      { id: "running", title: "Keeping it alive without a server", paragraphs: [
        "A forecast that is not updated is just an old chart. Every night around 11:30pm a scheduled job on GitHub downloads the newest data, forecasts the next 28 days and publishes the result, and the site picks it up. On the 1st of each month another job retrains the model on everything published so far, and only swaps it in if its forecasts stay close to the old model's. It costs me nothing to run.",
        "The site also keeps every forecast it has shown and scores it once the real number comes out. If the model starts doing badly, it will be visible to you as well as to me.",
        "You can try it on the [homepage](/#model-demo): pick the network, a line or your own station, and look up to 28 days ahead.",
      ] },
      { id: "next", title: "What is still missing", paragraphs: [
        "It cannot see a holiday that is announced at the last minute, a breakdown, or a sudden storm. Raya dates in future years are estimates until they are officially announced. New stations have very little history, so the LRT Shah Alam Line forecasts deserve less trust for now. And there is still no hourly view.",
        "I built this with an AI coding assistant, and I am grateful for it. It did a large share of the coding, testing and debugging. What to build, which ideas to keep or throw out, and whether a result was honest enough to publish were my calls.",
        "If you take the train in KL, try your station and tell me if it matches what you see on the platform. The code and the full test results are on [GitHub](https://github.com/VincentTeo1116/PersonalChatbot/tree/main/rapidkl-forecast).",
      ] },
    ],
  },
  {
    slug: "reading-malaysian-receipts-without-ai",
    title: "Teaching my expense app to read Malaysian receipts, mostly without AI",
    description: "How VinExpenses finds the total, merchant and date on a Malaysian receipt with a scoring parser instead of a language model, and why it would rather ask than guess.",
    published: "2026-11-13",
    updated: "2026-11-13",
    related: { href: "/projects/vinexpenses", label: "VinExpenses case study" },
    sections: [
      { id: "why", title: "Where my money went", paragraphs: [
        "When I started my part-time job I finally had money coming in, and almost immediately I had no idea where it was going. Some of it was cash. Some went through TnG eWallet, some through the bank app, some through other wallets. Every one of them has a transaction history, but nobody opens five apps to add up a month.",
        "There are plenty of expense trackers out there. I built my own anyway, partly to see if I could, and partly because I wanted my own dashboard, my own categories and my own rules. That became [VinExpenses](https://vincentteo1116.github.io/VinExpenses/).",
        "The feature I spent the longest on is receipt scanning: take a photo or drop in a PDF, and the app fills in the merchant, the total and the date.",
      ] },
      { id: "hard", title: "Why a receipt is harder than it looks", paragraphs: [
        "Pick up any receipt near you and count the numbers on it. Subtotal. Service charge. SST. Rounding. Total. Cash. Change. Maybe points earned. The total is one of seven or eight amounts, and it is usually not the biggest one, because the RM50 note you paid with is printed there too.",
        "Malaysian receipts add their own flavour. One shop prints \"Total\", the next prints \"Jumlah\", an e-wallet receipt says \"Anda bayar\", and a Chinese restaurant prints \"总计\". Dates come as Mac, Ogos and Disember. Some online receipts show a USD price beside the ringgit one.",
      ] },
      { id: "scoring", title: "Scoring instead of guessing", paragraphs: [
        "The obvious move today is to send the photo to an AI model and ask for the total. I did not want that as the default. It costs money on every scan, it is slower, and when it is wrong you cannot ask it why.",
        "So the parser does something more boring. After OCR turns the photo into text, every amount on the receipt gets a score based on the words beside it, or on the line above it, because e-mailed receipts love to put \"TOTAL\" on one line and the amount on the next. \"Grand total\", \"Jumlah besar\" or \"总计\" scores highest. A plain \"Total\" or \"Jumlah\" scores a bit lower. \"Subtotal\" and \"Jumlah kecil\" get a negative score, and so do tax lines and discounts. A price in another currency takes a penalty.",
        "Then come two checks I am quite happy with. If the same amount appears under more than one total-like label, it gets a bonus. And if subtotal plus tax and fees minus discounts adds up to a candidate, that candidate gets another bonus, because a receipt is basically a small maths problem that has already been solved for you.",
        "The merchant works the same way: lines near the top, in capital letters, ending in \"Sdn Bhd\", or matching the web address printed on the receipt score higher.",
      ] },
      { id: "ask", title: "When it is not sure, it asks", paragraphs: [
        "Every result is marked high, medium or low confidence, based on how strong the winning score is and how far ahead it is of the runner-up. On low confidence the app fills in nothing. It shows the top few amounts as buttons and you tap the right one.",
        "That was a deliberate choice. In a money app, a wrong number that looks right is worse than a question. You will not notice RM12.50 saved as RM125.00 until your month looks strange.",
        "There is an AI step, but it is the backup. It is switched off unless you tick the box, it only runs when the rules are unsure, and it is sent the text, never the photo. Its answer is checked before use: the amount has to be sensible, the date has to be real, and the category has to be one of yours. PDFs that already contain text never leave your phone at all.",
      ] },
      { id: "works", title: "Does it actually work?", paragraphs: [
        "I keep 8 real receipts, with the personal details removed, as tests. For each one the parser has to return the exact amount, merchant and date with high confidence, and all 8 pass. The whole project has 368 automated tests, and a failing one blocks the deploy.",
        "I should be straight about what that proves. Eight receipts tell me the parser keeps working on formats it has already seen. They do not tell me how often it is right on a receipt from a shop it has never met. I do not have that number yet, and I am not going to make one up.",
        "And a small confession: I mostly still type my own expenses in by hand. Old habit. It was my siblings and friends who started using the scanner properly, and they are the ones who told me it is useful and usually right. I am taking that as a sign I should use my own feature more.",
      ] },
      { id: "next", title: "What I would do next", paragraphs: [
        "Collect 30 to 50 labelled receipts and publish a real hit rate for amount, merchant and date. Add a demo account, because nobody wants to sign up just to look around. And the app only handles ringgit for now.",
        "The idea and the backend are my own work, and I drafted the screens myself. I used an AI assistant to tighten things up: proper fallbacks, hunting down bugs, checking the endpoints, and making my rough UI look better.",
        "The code, including the parser and its tests, is on [GitHub](https://github.com/VincentTeo1116/VinExpenses).",
      ] },
    ],
  },
  {
    slug: "data-leak-traffic-forecast",
    title: "Our traffic model was looking at the answer",
    description: "A data leak in a group assignment on SCATS traffic data: how a feature that was secretly the target got in, how I found it when rebuilding the project, and what the honest numbers look like.",
    published: "2026-11-13",
    updated: "2026-11-13",
    related: { href: "/projects/traffic-volume-forecasting", label: "Traffic forecasting case study" },
    sections: [
      { id: "assignment", title: "The assignment", paragraphs: [
        "For a group assignment, my teammates and I predicted traffic volume at road junctions in Victoria, Australia, using SCATS sensor data, which counts vehicles passing each site. We did the research the slow way, reading papers and trying things, and ended up with three approaches: XGBoost, Random Forest and a reinforcement learning agent.",
        "It went well. The models scored well, the report came together, and we were happy with it.",
      ] },
      { id: "found", title: "Reopening it months later", paragraphs: [
        "Later I wanted to put the project on my portfolio, properly, with a chart a visitor could play with. That meant rebuilding it from the raw data instead of copying old screenshots. While I was at it I asked an AI model for recommendations on the modelling side.",
        "One of the first things to come back was not a recommendation. It was a question about one of our own features: where exactly does lag_24_hours come from?",
        "The name says \"traffic at this site 24 hours ago\", which is a perfectly fair thing to give a model. But the way we had built that column, it was not yesterday's value. It was the value we were asking the model to predict, under a different name. The Random Forest had the same problem with another column, a sum that was really the target.",
        "So the models were not forecasting anything. They were copying the answer from the next seat.",
      ] },
      { id: "second", title: "The second leak was quieter", paragraphs: [
        "We had also split the data into training and test sets at random. For most problems that is normal. For time series it is a trap.",
        "A random split puts 9am on a Tuesday in the test set while 8am and 10am on that same Tuesday sit in the training set. The model does not need to understand traffic to fill that gap. It only needs to draw a line between two points it has already seen. Real forecasting never gets that luxury, because tomorrow has no neighbours yet.",
        "The reinforcement learning agent had its own version of this: the information it was shown about the current state included things from the future.",
      ] },
      { id: "why-missed", title: "Why nobody noticed", paragraphs: [
        "Nothing crashes when you leak data. No warning, no red text. The only symptom is a score that looks great, and a great score is exactly what you are hoping to see, so you say thank you and move on.",
        "That is the part that bothers me most. We were careful about plenty of things. We just never asked the unfriendly question: is this too good?",
      ] },
      { id: "honest", title: "The honest version", paragraphs: [
        "I rebuilt it with three rules. Split by date, so the model trains on earlier weeks and is tested on later ones. Only use inputs you would really have at the moment of forecasting. And always compare against a guess that needs no model at all.",
        "That last rule was humbling. My first clean model lost. A baseline that simply says \"this site, this hour, on a typical day of this type\" beat it by about 3%. Hours of work, beaten by an average.",
        "What fixed it was changing the question. Instead of predicting the traffic volume itself, the model now predicts how far a given hour will be from the typical day. The final version is off by 7.7% of traffic volume on weeks it has never seen. That is about 17% better than \"same hour last week\" and about 4% better than the typical-day baseline. Weekends are still a weak spot.",
        "Four percent is not a headline. But it is real, and I can explain where it comes from, which I could not say about the old score.",
      ] },
      { id: "checks", title: "What I check now", paragraphs: [
        "For every feature: could I actually have this number at the moment I make the prediction? If the answer needs a pause, look at how the column is built, not at what it is called.",
        "For time series: split by date. Always.",
        "Before trusting a model: build the lazy baseline first. If the model cannot beat it, the model is the problem.",
        "And if the score is amazing, get suspicious before you get happy.",
        "This project is also why my [Rapid KL forecast](/writing/forecasting-rapid-kl-ridership) is built the way it is. You can see the corrected traffic model on the [homepage](/#model-demo).",
      ] },
    ],
  },
  {
    slug: "telegram-bot-cloudflare-workers-free",
    title: "A haze and rain bot on Telegram that costs me nothing to run",
    description: "How SkyBrief sends each user a weather and air-quality report at their own local time using one Cloudflare Workers cron job, a small database and a backup data source, all on the free plan.",
    published: "2026-11-13",
    updated: "2026-11-13",
    related: { href: "/projects/skybrief-telegram-bot", label: "SkyBrief case study" },
    sections: [
      { id: "why", title: "Haze season, then rain season", paragraphs: [
        "If you were in the Klang Valley in September and October 2026, you remember the haze. On 18 September [Johan Setia hit an API of 193](https://www.malaymail.com/amp/news/malaysia/2026/09/18/haze-update-35-areas-now-with-unhealthy-api-selangors-johan-setia-tops-193/235635) and parts of KL were in the 160s. The air did not properly clear until [late October](https://www.malaymail.com/amp/news/malaysia/2026/10/27/fresher-air-in-malaysia-again-only-samalaju-in-sarawak-still-unhealthy-after-months-of-haze/240745). Then the year-end rain arrived, right on schedule.",
        "Every morning I was opening one app for the weather, another for the air quality, and sometimes a news site to see if there was a warning. I wanted one message, before I leave the house, that tells me whether to bring a mask, an umbrella, or both.",
        "So I built [SkyBrief](https://t.me/SkyBrief_AI_bot), a Telegram bot that sends exactly that.",
      ] },
      { id: "rewrite", title: "From a script for me to a bot for anyone", paragraphs: [
        "The first version was a Python script. A scheduled GitHub Action ran it once a day and it sent the report to me, and only me.",
        "It worked, but I wanted two things it could not do: let other people use it with their own city and their own time, and answer when someone types a command. I had also never touched Cloudflare Workers and wanted an excuse to try a proper cron job there. So I rewrote the whole thing in TypeScript.",
      ] },
      { id: "cron", title: "One alarm clock for everyone", paragraphs: [
        "Here is the problem. One user wants the report at 8:30am in Kuala Lumpur. Another wants 7am in a different timezone. You cannot create a separate scheduled job per person on a free plan.",
        "The answer is a single job that runs every minute. Each time it wakes up it asks one question: whose local time has just reached the time they chose? Those people get their report. Everyone else waits for a later minute.",
        "A few details make this hold up in real life. Before sending, the bot marks in the database that today's report for that user has been claimed, so two runs can never send it twice. If the bot was down at exactly 8:30, it still delivers for up to two hours afterwards instead of silently skipping the day. And each run handles at most 8 reports, because the free plan limits how many outgoing requests one run can make. Anyone left over is served a minute later, least overdue first, so one user whose send keeps failing cannot hold up the queue.",
      ] },
      { id: "backup", title: "When the weather service is down", paragraphs: [
        "Free data sources go down sometimes. If the main one, Open-Meteo, does not answer, SkyBrief switches to MET Norway and adds a small note at the bottom of the report saying it used the backup. I would rather tell you than pretend nothing happened.",
        "Air quality comes from the nearest real monitoring station when there is one within 40 km with a reading under three hours old. Otherwise it falls back to a modelled estimate.",
        "For Malaysia it also shows official MetMalaysia warnings. That feed does not include coordinates, so warnings are matched by state and district name. When the bot is not sure of your district it shows the warning anyway. A missed flood warning is worse than one extra message.",
      ] },
      { id: "free", title: "Still free", paragraphs: [
        "The whole thing runs on Cloudflare's free plan: the Worker, the small database, and a job that fires 1,440 times a day. There is no server to pay for and nothing to restart.",
        "It answers in English, Malay and Chinese, and there are about 250 automated tests that run before every deploy. Around five people use it at the moment, mostly people I know. That is a small number, and I am fine with that. I built it for my own mornings first.",
      ] },
      { id: "limits", title: "What it does not do", paragraphs: [
        "The name has \"AI\" in it, but there is no AI model inside. It is honest weather data, formatted well. Warnings only cover Malaysia, and the bot is not a replacement for official alerts. The air quality number uses the US scale, not Malaysia's official API reading, so it will not match the news exactly. And because the data is hourly, \"rain soon\" means within an hour or two, not in ten minutes.",
        "The idea and the backend logic are mine. I used an AI assistant to make it sturdier: proper fallbacks, fewer bugs, and checking that every endpoint behaves.",
        "Try it on [Telegram](https://t.me/SkyBrief_AI_bot), or read the code on [GitHub](https://github.com/VincentTeo1116/skybrief-telegram-bot).",
      ] },
    ],
  },
  {
    slug: "building-apmoodle-lms-team-of-five",
    title: "Five of us built a learning platform for an assignment. Here is what I learned",
    description: "Notes from building APMoodle, an ASP.NET learning management system with themed quizzes, chat and secure password recovery, as a team of five: what went well, the last-week merge, and what I would change.",
    published: "2026-11-13",
    updated: "2026-11-13",
    related: { href: "/projects/apmoodle-lms", label: "APMoodle case study" },
    sections: [
      { id: "brief", title: "The brief", paragraphs: [
        "The assignment was to build a web application with ASP.NET. Our group of five decided to build something we use every day as students and have plenty of opinions about: a learning management system. We called it APMoodle.",
        "It has three kinds of users. Students join a module with an invitation code, read the materials, take quizzes and see their scores over time. Lecturers manage their modules, upload materials, build quizzes and talk to students. Admins manage accounts and post announcements.",
        "We got the highest grade, 4.0, and very good feedback from our lecturer. I am proud of it, and I think the rest of the team is too. You can open it [here](https://apmoodle.onrender.com/), though it is on free hosting, so give it a moment to wake up.",
      ] },
      { id: "themes", title: "The feature people remember: quiz themes", paragraphs: [
        "A quiz on most learning platforms looks like a form. We wanted ours to feel like something you would not mind opening.",
        "So when a lecturer creates a quiz, they pick a theme. There is a clean default, a calm green Forest, a pop-art Comic, a soft Watercolor, and the one everyone tries first: a game-show theme in the style of Kahoot, with big coloured answer tiles, a large timer and a score counter.",
        "Same questions, same grading, completely different mood. A lecturer can use the game-show look for a fun revision round and a plain one for something serious. Quizzes can also be made public, so someone without an account can try one as a guest.",
      ] },
      { id: "security", title: "The boring parts we did not skip", paragraphs: [
        "It would have been easy to treat security as extra. We decided a platform that holds student accounts should behave like one.",
        "Passwords are hashed with BCrypt, never stored as plain text. If you forget your password, a 6-digit one-time code is e-mailed to you and it expires after five minutes. That form is protected by Google reCAPTCHA, so a script cannot hammer it. And whether or not the e-mail address exists, the page gives the same reply, \"if the email exists, an OTP has been sent\", so nobody can use it to find out who has an account.",
        "Pages also check your role on the server, so a student cannot open a lecturer page just by typing its address.",
      ] },
      { id: "chat", title: "Chat without the fancy part", paragraphs: [
        "Students and lecturers can message each other inside the platform, with unread markers. Under the hood it is simple: the page asks the server for new messages every few seconds.",
        "That is called polling. It is not the elegant way, since a proper real-time connection would push a message the moment it is sent. But polling was something we could build, test and trust inside the deadline, and it works. For a class-sized group nobody notices the short delay.",
      ] },
      { id: "merge", title: "The last week", paragraphs: [
        "Our one real scare was self-inflicted. In the final week we decided to add a few more features. Everybody built their part, everybody pushed, and then we spent a good chunk of that week untangling merge conflicts instead of polishing.",
        "It ended fine. Everything worked on the day, including the chat and the file uploads. But the lesson stuck with me: agree on a date after which nothing new goes in, and merge small pieces often instead of five big ones at the end. Git only gets scary when you leave it alone for too long.",
      ] },
      { id: "change", title: "What I would change now", paragraphs: [
        "Use a real-time connection (SignalR, in the ASP.NET world) for chat. Store uploaded files in proper file storage instead of the web server's own folder. Generate the one-time code with a cryptographic random generator. And write automated tests for the paths that matter most: registering, resetting a password, joining a module and grading a quiz.",
        "None of that takes away from what we shipped. It is just what you see when you look back at your own work a few months later, which I think is the point of looking.",
        "The code is on [GitHub](https://github.com/VincentTeo1116/apmoodle).",
      ] },
    ],
  },
];

// The live site only shows published articles; drafts appear when the site runs locally so they can be read before publishing.
export const articles: EngineeringArticle[] = allArticles.filter((article) => !article.draft || process.env.NODE_ENV !== "production");

export function getArticle(slug: string) {
  return articles.find((article) => article.slug === slug);
}
