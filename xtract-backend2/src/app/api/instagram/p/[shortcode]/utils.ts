import { RequestConfigType } from "@/types/request-config";
import { IG_GraphQLResponseDto } from "@/features/api/_dto/instagram";

import querystring from "querystring";

// Rotate between different realistic User-Agents
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0"
];

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function generateRequestBody(shortcode: string) {
  // Add some randomization to make requests less predictable
  const timestamp = Math.floor(Date.now() / 1000);
  const randomId = Math.floor(Math.random() * 1000000);
  
  return querystring.stringify({
    av: "0",
    __d: "www",
    __user: "0",
    __a: "1",
    __req: "b",
    __hs: "20183.HYP:instagram_web_pkg.2.1...0",
    dpr: "3",
    __ccg: "GOOD",
    __rev: "1021613311",
    __s: `hm5eih:ztapmw:x0lo${randomId}`, // Add some randomization
    __hsi: `7489787314313612${randomId}`,
    __dyn:
      "7xeUjG1mxu1syUbFp41twpUnwgU7SbzEdF8aUco2qwJw5ux609vCwjE1EE2Cw8G11wBz81s8hwGxu786a3a1YwBgao6C0Mo2swtUd8-U2zxe2GewGw9a361qw8Xxm16wa-0oa2-azo7u3C2u2J0bS1LwTwKG1pg2fwxyo6O1FwlA3a3zhA6bwIxe6V8aUuwm8jwhU3cyVrDyo",
    __csr:
      "goMJ6MT9Z48KVkIBBvRfqKOkinBtG-FfLaRgG-lZ9Qji9XGexh7VozjHRKq5J6KVqjQdGl2pAFmvK5GWGXyk8h9GA-m6V5yF4UWagnJzazAbZ5osXuFkVeGCHG8GF4l5yp9oOezpo88PAlZ1Pxa5bxGQ7o9VrFbg-8wwxp1G2acxacGVQ00jyoE0ijonyXwfwEnwWwkA2m0dLw3tE1I80hCg8UeU4Ohox0clAhAtsM0iCA9wap4DwhS1fxW0fLhpRB51m13xC3e0h2t2H801HQw1bu02j-",
    __comet_req: "7",
    lsd: "AVrqPT0gJDo",
    jazoest: "2946",
    __spin_r: "1021613311",
    __spin_b: "trunk",
    __spin_t: timestamp.toString(), // Use current timestamp
    __crn: "comet.igweb.PolarisPostRoute",
    fb_api_caller_class: "RelayModern",
    fb_api_req_friendly_name: "PolarisPostActionLoadPostQueryQuery",
    variables: JSON.stringify({
      shortcode: shortcode,
      fetch_tagged_user_count: null,
      hoisted_comment_id: null,
      hoisted_reply_id: null,
    }),
    server_timestamps: true,
    doc_id: "8845758582119845",
  });
}

export type GetInstagramPostRequest = {
  shortcode: string;
};

export type GetInstagramPostResponse = IG_GraphQLResponseDto;

// Add delay function to slow down requests
function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function getInstagramPostGraphQL(
  data: GetInstagramPostRequest,
  requestConfig?: RequestConfigType
) {
  const requestUrl = new URL("https://www.instagram.com/graphql/query");
  
  // Add a small random delay to avoid looking like a bot
  await delay(Math.random() * 2000 + 1000); // 1-3 second delay

  return fetch(requestUrl, {
    credentials: "include",
    headers: {
      "User-Agent": getRandomUserAgent(), // Use random User-Agent
      Accept: "*/*",
      "Accept-Language": "en-US,en;q=0.9",
      "Content-Type": "application/x-www-form-urlencoded",
      "X-FB-Friendly-Name": "PolarisPostActionLoadPostQueryQuery",
      "X-BLOKS-VERSION-ID":
        "0d99de0d13662a50e0958bcb112dd651f70dea02e1859073ab25f8f2a477de96",
      "X-CSRFToken": "uy8OpI1kndx4oUHjlHaUfu",
      "X-IG-App-ID": "1217981644879628",
      "X-FB-LSD": "AVrqPT0gJDo",
      "X-ASBD-ID": "359341",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin",
      Pragma: "no-cache",
      "Cache-Control": "no-cache",
    },
    referrer: `https://www.instagram.com/p/${data.shortcode}/`,
    body: generateRequestBody(data.shortcode),
    method: "POST",
    mode: "cors",
    ...requestConfig,
  });
}
