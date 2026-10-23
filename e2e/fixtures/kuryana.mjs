import { createServer } from "node:http";

const port = Number(process.env.KURYANA_TEST_PORT ?? 3199);
const slug = "729705-hidden-love";
const results = (title, raw = slug, type = "Chinese Drama") => ({ slug: raw, title, type, year: 2023, series: "2 episodes", rating: 9 });
const details = {
  data: {
    title: "Hidden Love (2023)", year: "2023", rating: 9, synopsis: "An Asian drama from the test catalog.",
    details: { country: "China", type: "Drama", episodes: "2", aired: "Jun 20, 2023 - Jul 6, 2023", original_network: "Youku", duration: "45 min." },
    others: { genres: ["Romance"], native_title: ["偷偷藏不住"] },
  },
};
createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  let body;
  let status = 200;
  if (pathname === "/health") body = { healthy: true };
  else if (pathname.startsWith("/search/q/")) {
    const query = pathname.slice("/search/q/".length).toLowerCase();
    if (query === "echoes of orion") { status = 503; body = { error: true }; }
    else body = { results: { dramas: query === "hidden love" || query === "偷偷藏不住" ? [results("Hidden Love")]
      : query === "orion" ? [results("Orion Love", "42-orion-love", "Korean Drama")] : [] } };
  } else if (pathname === `/id/${slug}`) body = details;
  else if (pathname === `/id/${slug}/episodes`) body = { data: { episodes: [
    { title: "Hidden Love Episode 1", link: `https://mydramalist.com/${slug}/episode/1`, air_date: "Jun 20, 2023" },
    { title: "Hidden Love Episode 2", link: `https://mydramalist.com/${slug}/episode/2`, air_date: "Mar 04, 2099" },
  ] } };
  else { status = 404; body = { error: true }; }
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}).listen(port, "127.0.0.1");
