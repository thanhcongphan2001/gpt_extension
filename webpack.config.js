const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
// const ExtensionReloader = require('webpack-extension-reloader');

module.exports = (env, argv) => {
  const isProduction = argv.mode === "production";
  const isDevelopment = !isProduction;

  return {
    entry: {
      background: "./background.js",
      popup: "./popup.js",
      "gpt-popup": "./gpt-popup.js",
    },

    output: {
      path: path.resolve(__dirname, "dist"),
      filename: "[name].js",
      clean: true,
    },

    mode: argv.mode || "development",

    devtool: isDevelopment ? "cheap-module-source-map" : false,

    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: "babel-loader",
            options: {
              presets: ["@babel/preset-env"],
            },
          },
        },
        {
          test: /\.css$/,
          use: [
            isDevelopment ? "style-loader" : MiniCssExtractPlugin.loader,
            "css-loader",
          ],
        },
        {
          test: /\.(png|jpg|jpeg|gif|svg)$/,
          type: "asset/resource",
          generator: {
            filename: "icons/[name][ext]",
          },
        },
      ],
    },

    plugins: [
      // Copy static files
      new CopyWebpackPlugin({
        patterns: [
          {
            from: "manifest.json",
            to: "manifest.json",
            transform(content) {
              const manifest = JSON.parse(content.toString());

              // Modify manifest for development
              if (isDevelopment) {
                manifest.name += " (Dev)";
                manifest.version = manifest.version + ".dev";
              }

              return JSON.stringify(manifest, null, 2);
            },
          },
          {
            from: "popup.html",
            to: "popup.html",
          },
          {
            from: "gpt-popup.html",
            to: "gpt-popup.html",
          },
          {
            from: "popup.css",
            to: "popup.css",
          },
          {
            from: "icons",
            to: "icons",
            noErrorOnMissing: true,
          },
          {
            from: "services",
            to: "services",
            noErrorOnMissing: true,
          },
          {
            from: "utils",
            to: "utils",
            noErrorOnMissing: true,
          },
        ],
      }),

      // Extract CSS in production
      ...(isProduction
        ? [
            new MiniCssExtractPlugin({
              filename: "[name].css",
            }),
          ]
        : []),

      // Hot reload in development - manual reload required
      // Extension will need manual reload in chrome://extensions/
    ],

    resolve: {
      extensions: [".js", ".json"],
      alias: {
        "@": path.resolve(__dirname, "."),
        "@services": path.resolve(__dirname, "services"),
        "@utils": path.resolve(__dirname, "utils"),
      },
    },

    optimization: {
      minimize: isProduction,
      splitChunks: {
        chunks: "all",
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: "vendors",
            chunks: "all",
          },
          common: {
            name: "common",
            minChunks: 2,
            chunks: "all",
            enforce: true,
          },
        },
      },
    },

    // Chrome extension specific settings
    target: "web",

    stats: {
      colors: true,
      modules: false,
      children: false,
      chunks: false,
      chunkModules: false,
    },

    watchOptions: {
      ignored: /node_modules/,
      aggregateTimeout: 300,
      poll: 1000,
    },
  };
};
