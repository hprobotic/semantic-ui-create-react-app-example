const autoprefixer = require('autoprefixer');
const path = require('path');
const paths = require('./paths');
const isDev = process.env.NODE_ENV === 'development';
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const shouldUseRelativeAssetPaths = paths.servedPath === './';

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
const shouldUseSourceMap =
  process.env.NODE_ENV === 'production' &&
  process.env.GENERATE_SOURCEMAP !== 'false';

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
    plugins: [...config.plugins, extractLess],
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
