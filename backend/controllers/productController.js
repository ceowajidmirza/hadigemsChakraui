//model imports
const Product = require("../models/product");

//error handlers
const ErrorHandler = require("../utils/ErrorHandler");
const catchAsyncErrors = require("../middlewares/catchAsyncErrors");

const APIFeatures = require("../utils/APIFeatures");

const cloudinary = require("cloudinary");

//create new product /api/v1/admin/product/new
exports.newProduct = catchAsyncErrors(async (req, res, next) => {
  let images = [];
  if (typeof images === "string") {
    images.push(req.body.images);
  } else {
    images = req.body.images;
  }

  let imagesLinks = [];

  for (let i = 0; i < images.length; i++) {
    const result = await cloudinary.v2.uploader.upload(images[i], {
      folder: "products",
    });
    imagesLinks.push({
      public_id: result.public_id,
      url: result.secure_url,
    });
  }

  const productInfo = [];

  if (typeof productInfo === "string") {
    productInfo.push(req.body.productInfo);
  } else {
    productInfo = req.body.productInfo;
  }

  req.body.images = imagesLinks;
  req.body.user = req.user.id;
  req.body.productInfo = productInfo;

  console.log(req.body);

  const product = await Product.create(req.body);

  res.status(201).json({
    success: true,
    product,
  });
});

//get all product /api/v1/products
exports.getProducts = catchAsyncErrors(async (req, res, next) => {
  const resPerPage = 9;
  const dbProductCount = await Product.countDocuments();

  const apiFeature = new APIFeatures(Product.find(), req.query)
    .search()
    .filter();

  let products = await apiFeature.query;
  let filteredProdcutsCount = products.length;

  let featuredProducts = products.filter((product) => product.isFeatured);
  let featuredProdcutsCount = featuredProducts.length;
  let premiumProducts = products.filter((product) => product.isPremium);
  let premiumProductsCount = premiumProducts.length;
  let onSaleProducts = products.filter((product) => product.onSale);
  let onSaleProductsCount = onSaleProducts.length;
  apiFeature.pagination(resPerPage);
  products = await apiFeature.query;
  featuredProdcuts = await apiFeature.query;

  res.status(200).json({
    success: true,
    resPerPage,
    dbProductCount,
    products,
    featuredProducts,
    featuredProdcutsCount,
    premiumProducts,
    premiumProductsCount,
    onSaleProducts,
    onSaleProductsCount,
    filteredProdcutsCount,
  });
});

//get all admin product /api/v1/admin/products
exports.getAdminProducts = catchAsyncErrors(async (req, res, next) => {
  const products = await Product.find();

  res.status(200).json({
    success: true,
    products,
  });
});

//get single product /api/v1/product/:id

exports.getSingleProduct = catchAsyncErrors(async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    return next(new ErrorHandler("product not found!", 404));
  }

  res.status(200).json({
    success: true,
    product,
  });
});

//update the product /api/v1/admin/product/:id

exports.updateProduct = catchAsyncErrors(async (req, res, next) => {
  let product = await Product.findById(req.params.id);
  if (!product) {
    return next(new ErrorHandler("product not found!", 404));
  }

  product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
    useFindAndModify: false,
  });
  res.status(200).json({
    success: true,
    product,
  });
});

//delete the product /api/v1/admin/product/:id

exports.deleteProduct = catchAsyncErrors(async (req, res, next) => {
  let product = await Product.findById(req.params.id);
  if (!product) {
    return next(new ErrorHandler("product not found!", 404));
  }

  await product.remove();

  res.status(200).json({
    success: true,
    message: "product deleted",
  });
});

// create new review /api/v1/review

exports.createProdcuctReview = catchAsyncErrors(async (req, res, next) => {
  const { rating, comment, productId } = req.body;

  const review = {
    user: req.user._id,
    name: req.user.name,
    rating: Number(rating),
    comment,
  };

  const product = await Product.findById(productId);

  const isReviewed = product.reviews.find(
    (r) => r.user.toString() === req.user._id.toString()
  );

  if (isReviewed) {
    product.reviews.forEach((review) => {
      if (review.user.toString() === req.user._id.toString()) {
        review.comment = comment;
        review.rating = rating;
      }
    });
  } else {
    product.reviews.push(review);
    product.numOfReviews = product.reviews.length;
  }

  product.ratings =
    product.reviews.reduce((acc, item) => item.rating + acc, 0) /
    product.reviews.length;

  await product.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
  });
});

//Get Product Reviews /api/v1/reviws

exports.getProductReviews = catchAsyncErrors(async (req, res, next) => {
  const product = await Product.findById(req.query.id);

  res.status(200).json({
    success: true,
    reviews: product.reviews,
  });
});

//Delete Product Review /api/v1/reviws

exports.deleteProductReview = catchAsyncErrors(async (req, res, next) => {
  const product = await Product.findById(req.query.productId);

  const reviews = product.reviews.filter(
    (review) => review._id.toString() !== req.query.id.toString()
  );

  const numOfReviews = reviews.length;

  const ratings =
    product.reviews.reduce((acc, item) => item.rating + acc, 0) /
    product.reviews.length;

  await Product.findByIdAndUpdate(
    req.query.productId,
    {
      reviews,
      ratings,
      numOfReviews,
    },
    {
      new: true,
      runValidators: true,
      useFindAndModify: false,
    }
  );

  res.status(200).json({
    success: true,
    reviews: product.reviews,
  });
});
