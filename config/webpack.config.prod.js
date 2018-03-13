const autoprefixer = require('autoprefixer');
const path = require('path');
const paths = require('./paths');
const webpack = require('webpack');
const isDev = process.env.NODE_ENV === 'development';
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const shouldUseRelativeAssetPaths = paths.servedPath === './';
const HtmlWebpackPlugin = require('html-webpack-plugin');
const InterpolateHtmlPlugin = require('react-dev-utils/InterpolateHtmlPlugin');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const getClientEnvironment = require('./env');
const publicPath = paths.servedPath;
const publicUrl = publicPath.slice(0, -1);
const ManifestPlugin = require('webpack-manifest-plugin');
const StyleExtHtmlWebpackPlugin = require('style-ext-html-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
const OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin');

const env = getClientEnvironment(publicUrl);

const cssFilename = 'static/css/[name].[contenthash:8].css';
const cssClassName = isDev
  ? '[path][name]__[local]--[hash:base64:5]'
  : '[hash:base64:5]';

const extractLess = new ExtractTextPlugin({
  filename: cssFilename,
  disable: isDev
});

const autoprefixerOptions = {
  browsers: [
    '>1%',
    'last 4 versions',
    'Firefox ESR',
    'not ie < 9' // React doesn't support IE8 anyway
  ],
  flexbox: 'no-2009'
};

const extractTextPluginOptions = shouldUseRelativeAssetPaths
  ? // Making sure that the publicPath goes back to to build folder.
    { publicPath: Array(cssFilename.split('/').length).join('../') }
  : {};
const shouldUseSourceMap = process.env.NODE_ENV !== 'production';

module.exports = function(config) {
  // Add `less, config, overrides and variables` file types to exclude file-loader
  const options = config.module.rules[1].oneOf;
  config.module.rules[1].oneOf[options.length - 1].exclude = [
    ...config.module.rules[1].oneOf[options.length - 1].exclude,
    /\.less$/,
    /\.(config|overrides|variables)$/
  ];

  config = {
    ...config,
    bail: true,
    devtool: shouldUseSourceMap ? 'source-map' : false,
    plugins: [
      extractLess,
      // Makes some environment variables available in index.html.
      // The public URL is available as %PUBLIC_URL% in index.html, e.g.:
      // <link rel="shortcut icon" href="%PUBLIC_URL%/favicon.ico">
      // In production, it will be an empty string unless you specify "homepage"
      // in `package.json`, in which case it will be the pathname of that URL.
      new InterpolateHtmlPlugin(env.raw),
      // Generates an `index.html` file with the <script> injected.
      new HtmlWebpackPlugin({
        inject: true,
        template: paths.appHtml,
        minify: {
          removeComments: true,
          collapseWhitespace: true,
          removeRedundantAttributes: true,
          useShortDoctype: true,
          removeEmptyAttributes: true,
          removeStyleLinkTypeAttributes: true,
          keepClosingSlash: true,
          minifyJS: true,
          minifyCSS: true,
          minifyURLs: true
        }
      }),
      // Makes some environment variables available to the JS code, for example:
      // if (process.env.NODE_ENV === 'production') { ... }. See `./env.js`.
      // It is absolutely essential that NODE_ENV was set to production here.
      // Otherwise React will be compiled in the very slow development mode.
      new webpack.DefinePlugin(env.stringified),
      new webpack.optimize.ModuleConcatenationPlugin(),
      new webpack.optimize.CommonsChunkPlugin({
        name: 'vendor',
        filename: 'vendor.[chunkhash].js',
        minChunks(module) {
          return module.context && module.context.indexOf('node_modules') >= 0;
        }
      }),
      // Minify the code.
      new UglifyJsPlugin({
        cache: true,
        sourceMap: shouldUseSourceMap,
        uglifyOptions: {
          compress: {
            warnings: false,
            screw_ie8: true,
            conditionals: true,
            unused: true,
            comparisons: true,
            sequences: true,
            dead_code: true,
            evaluate: true,
            if_return: true,
            join_vars: true
          },
          mangle: {
            safari10: true
          },
          output: {
            comments: false,
            // Turned on because emoji and regex is not minified properly using default
            // https://github.com/facebookincubator/create-react-app/issues/2488
            ascii_only: true
          }
        }
      }),
      new webpack.HashedModuleIdsPlugin(),
      new ExtractTextPlugin({
        filename: '[name].[contenthash].css',
        allChunks: true
      }),
      new CompressionPlugin({
        asset: '[path].gz[query]',
        algorithm: 'gzip',
        test: /\.js$|\.css$|\.html$|\.eot?.+$|\.ttf?.+$|\.woff?.+$|\.svg?.+$/,
        threshold: 10240,
        minRatio: 0.8
      }),
      // Generate a manifest file which contains a mapping of all asset filenames
      // to their corresponding output file so that tools can pick it up without
      // having to parse `index.html`.
      new ManifestPlugin({
        fileName: 'asset-manifest.json'
      }),
      // Add Bundle Analyzer when it's required
      process.env.ANALYZE && new BundleAnalyzerPlugin()
    ].filter(Boolean),
    entry: [paths.appIndexJs],
    output: {
      // The build folder.
      path: paths.appBuild,
      // Generated JS file names (with nested folders).
      // There will be one main bundle, and one file per asynchronous chunk.
      // We don't currently advertise code splitting but Webpack supports it.
      filename: 'static/js/[name].[chunkhash:8].js',
      chunkFilename: 'static/js/[name].[chunkhash:8].chunk.js',
      // We inferred the "public path" (such as / or /my-project) from homepage.
      publicPath,
      // Point sourcemap entries to original disk location (format as URL on Windows)
      devtoolModuleFilenameTemplate: info =>
        path
          .relative(paths.appSrc, info.absoluteResourcePath)
          .replace(/\\/g, '/')
    },
    resolve: {
      ...config.resolve,
      alias: {
        ...config.resolve.alias,
        '../../theme.config$': path.resolve(
          paths.appSrc,
          'styling/theme.config'
        ),
        heading: path.resolve(paths.appSrc, 'styling/heading.less')
      },
      modules: ['node_modules', paths.appSrc, paths.appNodeModules].concat(
        // It is guaranteed to exist because we tweak it in `env.js`
        process.env.NODE_PATH.split(path.delimiter).filter(Boolean)
      )
    },
    module: {
      ...config.module,
      rules: [
        {
          test: /\.less$/,
          exclude: [path.resolve(paths.appSrc, 'components')],
          use: extractLess.extract({
            fallback: {
              loader: 'style-loader',
              options: {
                hmr: isDev
              }
            },
            use: [
              {
                loader: require.resolve('css-loader'),
                options: {
                  importLoaders: 1,
                  minimize: { discardComments: { removeAll: true } },
                  sourceMap: shouldUseSourceMap
                }
              },
              {
                loader: require.resolve('postcss-loader'),
                options: {
                  ident: 'postcss',
                  plugins: () => [
                    require('postcss-flexbugs-fixes'),
                    autoprefixer(autoprefixerOptions)
                  ]
                }
              },
              { loader: require.resolve('less-loader') }
            ],
            ...extractTextPluginOptions
          })
        },
        {
          test: /\.less$/,
          include: [path.resolve(paths.appSrc, 'components')],
          use: extractLess.extract({
            fallback: {
              loader: require.resolve('style-loader'),
              options: {
                hmr: isDev
              }
            },
            use: [
              {
                loader: require.resolve('css-loader'),
                options: {
                  importLoaders: 1,
                  localIdentName: cssClassName,
                  modules: true,
                  minimize: process.env.NODE_ENV === 'production',
                  sourceMap: shouldUseSourceMap
                }
              },
              {
                loader: require.resolve('postcss-loader'),
                options: {
                  ident: 'postcss',
                  plugins: () => [
                    require('postcss-flexbugs-fixes'),
                    autoprefixer(autoprefixerOptions)
                  ]
                }
              },
              { loader: require.resolve('less-loader') }
            ]
          })
        },
        ...config.module.rules
      ]
    }
  };

  return config;
};
