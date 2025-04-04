// controllers/newsController.js
const News = require("../models/newsModel");
const axios = require("axios");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const mongoose=require("mongoose");
// Helper function to categorize news
const categorizeNews = (title, description) => {
  const pollutionKeywords = [
    "pollution",
    "contamination",
    "waste",
    "sewage",
    "dirty water",
  ];
  const governmentKeywords = [
    "scheme",
    "policy",
    "ministry",
    "government",
    "initiative",
    "project",
  ];

  const text = `${title} ${description}`.toLowerCase();

  if (pollutionKeywords.some((keyword) => text.includes(keyword))) {
    return "pollution";
  } else if (governmentKeywords.some((keyword) => text.includes(keyword))) {
    return "government";
  }
  return "other";
};

exports.fetchAndUpdateNews = catchAsync(async (req, res, next) => {
  // NewsAPI parameters
  const params = {
    apiKey: process.env.NEWS_API_KEY,
   
    language: "en",
    sortBy: "relevancy",
    pageSize: 20,
  };
 let q= "(water OR river) AND (pollution OR conservation OR cleanup OR government OR scheme OR project)";
  try {
    // Fetch news from NewsAPI
    const response = await axios.get(`https://newsapi.org/v2/everything?q=${q}&apiKey=${process.env.NEWS_API_KEY}&language=en&pageSize=10&sortBy=relevancy` );

    if (!response.data || !response.data.articles) {
      return next(new AppError("Failed to fetch news from API", 500));
    }

    const articles = response.data.articles;

    // Begin transaction to ensure data consistency
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Clear existing news collection
      await News.deleteMany({}, { session });

      // Process and categorize news articles
      const newsToInsert = articles.map((article) => ({
        title: article.title,
        description: article.description || "",
        content: article.content || "",
        url: article.url,
        urlToImage: article.urlToImage || "",
        publishedAt: new Date(article.publishedAt),
        source: {
          id: article.source.id || null,
          name: article.source.name || "Unknown",
        },
        category: categorizeNews(article.title, article.description || ""),
      }));

      // Insert new articles
      await News.insertMany(newsToInsert, { session });

      // Commit the transaction
      await session.commitTransaction();
      session.endSession();

      res.status(200).json({
        status: "success",
        results: newsToInsert.length,
        data: {
          news: newsToInsert,
        },
      });
    } catch (error) {
      // Abort transaction on error
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error) {
    console.error("Error fetching or updating news:", error);
    return next(new AppError("Failed to update news database", 500));
  }
});

// Get news from database
exports.getNews = catchAsync(async (req, res, next) => {
  const { category } = req.query;

  const filter = {};
  if (category && ["pollution", "government", "other"].includes(category)) {
    filter.category = category;
  }

  const news = await News.find(filter).sort({ publishedAt: -1 }).limit(10);

  res.status(200).json({
    status: "success",
    results: news.length,
    data: {
      news,
    },
  });
});
