import extractSearchResults from "../extractors/search.extractor.js";

export const search = async (req) => {
  try {
    let { keyword } = req.query;
    let page = parseInt(req.query.page) || 1;

    let type = req.query.type || "";
    let status = req.query.status || "";
    let rated = req.query.rated || "";
    let score = req.query.score || "";
    let season = req.query.season || "";
    let language = req.query.language || "";
    let sy = req.query.sy || "";
    let sm = req.query.sm || "";
    let sd = req.query.sd || "";
    let ey = req.query.ey || "";
    let em = req.query.em || "";
    let ed = req.query.ed || "";
    let sort = req.query.sort || "";
    let genres = req.query.genres || "";

    const [totalPage, totalResults, data] = await extractSearchResults(
      encodeURIComponent(keyword),
      type,
      status,
      rated,
      score,
      season,
      language,
      sy,
      sm,
      sd,
      ey,
      em,
      ed,
      sort,
      genres,
      page
    );
    if (page > totalPage) {
      const error = new Error("Requested page exceeds total available pages.");
      error.status = 404;
      throw error;
    }
    return { totalPage, totalResults, data };
  } catch (e) {
    console.error(e);
    if (e.status === 404) {
      throw e;
    }
    throw new Error("An error occurred while processing your request.");
  }
};
