module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        "babel-preset-expo",
        {
          native: {
            "react-compiler": {
              target: "19",
            },
          },
          web: {
            "react-compiler": {
              target: "19",
            },
          },
        },
      ],
    ],
  };
};
