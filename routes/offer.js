// Import cloudniary
const cloudinary = require("cloudinary").v2;

// Init server & router
const express = require("express");
const router = express.Router();

//import models
const Offer = require("../models/Offer.js");
const User = require("../models/User.js");

// Import middelwares
const isAuthenticated = require("../middleware/isAuthenticated.js");

// --------------------------------- Get Offers route

router.get("/offers", async (req, res) => {
  try {
    // Destructure query params
    const { title, priceMin, priceMax, sort, page, limit } = req.query;

    // Build filter object to pass into find();
    let filter = {};
    if (title) {
      filter.product_name = new RegExp(title, "i");
    }
    if (priceMin && priceMax) {
      filter.product_price = { $lte: Number(priceMax), $gte: Number(priceMin) };
    } else if (priceMax) {
      filter.product_price = { $lte: priceMax };
    } else if (priceMin) {
      filter.product_price = { $gte: priceMin };
    }

    // Build sorter object to pass into sort()
    let sorter = {};
    if (sort) {
      if (sort === "price-asc") {
        sorter.product_price = 1;
      }
      if (sort === "price-desc") {
        sorter.product_price = -1;
      }
    }

    // Calculate pagination
    const numOfItemsToDisplay = limit ? Number(limit) : 5;
    const numOfItemsToSkip = Number(page) > 0 ? (Number(page) - 1) * limit : 0;

    // Apply filters
    const offers = await Offer.find(filter)
      // .populate("owner", "account")
      .populate({
        path: "owner",
        select: "account",
      })
      .sort(sorter)
      .limit(numOfItemsToDisplay)
      .skip(numOfItemsToSkip)
      .select("_id product_name product_price");

    const count = await Offer.countDocuments(filter);
    // Answer to client
    res.status(200).json({ count: count, offers: offers });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// --------------------------------- Publish offer route

router.post("/offer/publish", isAuthenticated, async (req, res) => {
  try {
    // Destructure body
    const {
      title,
      description,
      price,
      condition,
      city,
      brand,
      size,
      color,
    } = req.fields;

    // Validations
    if (title.length > 50)
      return res
        .status(400)
        .json({ error: { message: "Title is limited to 50 caracters" } });

    if (description.length > 500)
      return res.status(400).json({
        error: { message: "Description is limited to 500 caracters" },
      });

    if (price > 10000)
      return res
        .status(400)
        .json({ error: { message: "Price is limited to 10.000" } });

    // Instanciate new offer
    const newOffer = await new Offer({
      product_name: title,
      product_description: description,
      product_price: price,
      product_details: [
        { MARQUE: brand },
        { TAILLE: size },
        { ETAT: condition },
        { COULEUR: color },
        { EMPLACEMENT: city },
      ],
      product_image: null,
      owner: req.user,
    });

    // Upload file in Cloudinary
    const filePath = req.files.picture.path;
    const uploadedFile = await cloudinary.uploader.upload(
      filePath,
      {
        folder: `/vinted/offers/${newOffer._id}`,
      },
      function (error, result) {
        console.log(error ? error : result);
      }
    );

    newOffer.product_image = uploadedFile;
    await newOffer.save();

    // Answer to client
    res.status(200).json({ newOffer });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// --------------------------------- Offer route
router.get("/offer/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const offer = await Offer.findById(id).populate("owner", "account");

    // Manage query response
    if (!offer)
      return res.status(400).json({ error: { message: "Offer not found" } });

    res.status(200).json(offer);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// --------------------------------- Update offer route

router.put("/offer/:id/update", isAuthenticated, async (req, res) => {
  try {
    // Destructure
    const { id } = req.params;
    const offer = await Offer.findById(id).populate("owner");
    const token = req.headers.authorization.replace("Bearer ", "");
    const {
      title,
      description,
      price,
      condition,
      city,
      brand,
      size,
      color,
    } = req.fields;

    // Manage query response
    if (!offer)
      return res.status(400).json({ error: { message: "Offer not found" } });

    if (offer.owner.token != token)
      return res
        .status(400)
        .json({ error: { message: "You're not the owner" } });

    // Update document
    await Offer.updateOne(
      { _id: id },
      {
        product_name: title,
        product_description: description,
        product_price: price,
        product_details: [
          { MARQUE: brand },
          { TAILLE: size },
          { ETAT: condition },
          { COULEUR: color },
          { EMPLACEMENT: city },
        ],
      }
    );

    // Update file in Cloudinary
    if (req.files.product_image) {
      const filePath = req.files.picture.path;
      const uploadedFile = await cloudinary.uploader.upload(
        filePath,
        {
          folder: `/vinted/offers/${offer._id}`,
        },
        function (error, result) {
          console.log(error ? error : result);
        }
      );
      offer.product_image = uploadedFile;
    }

    await offer.save();

    // Answer to client
    res.status(200).json({ message: "Offer successfully updated" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// --------------------------------- Update offer route

router.delete("/offer/:id/delete", isAuthenticated, async (req, res) => {
  try {
    // Destructure
    console.log("in route");
    const { id } = req.params;
    const offer = await Offer.findById(id).populate("owner");
    const token = req.headers.authorization.replace("Bearer ", "");

    // Manage query response
    if (!offer)
      return res.status(400).json({ error: { message: "Offer not found" } });

    if (offer.owner.token != token)
      return res
        .status(400)
        .json({ error: { message: "You're not the owner" } });

    // Delete cloudinary assets and folder
    const public_id = offer.product_image.public_id;
    const resultImage = await cloudinary.uploader.destroy(public_id);
    const resultFolder = await cloudinary.api.delete_folder(
      `/vinted/offers/${offer._id}`
    );

    const resultOffer = await Offer.deleteOne({ _id: id });
    res.status(200).json({ resultImage, resultFolder, resultOffer });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
