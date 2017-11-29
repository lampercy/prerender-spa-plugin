const Chromeless = require('chromeless').Chromeless;
const Hapi = require('hapi');
const Inert = require('inert');
const Path = require('path');
const PortFinder = require('portfinder');

module.exports = function (staticDir, route, options, callback) {
  function serveAndPrerenderRoute () {
    PortFinder.getPort(function (error, port) {
      if (error) throw error;

      const Server = new Hapi.Server({
        connections: {
          routes: {
            files: {
              relativeTo: staticDir,
            },
          },
        },
      });

      Server.connection({ port: port });

      Server.register(Inert, function (error) {
        if (error) throw error;
        const indexPath = options.indexPath ? options.indexPath : Path.join(staticDir, 'index.html');

        Server.route({
          method: 'GET',
          path: route,
          handler: function (request, reply) {
            reply.file(
              indexPath
            );
          },
        });

        Server.route({
          method: 'GET',
          path: '/{param*}',
          handler: {
            directory: {
              path: '.',
              redirectToSlash: true,
              index: true,
              showHidden: true,
            },
          },
        });

        Server.start(function (error) {
          if (error) return serveAndPrerenderRoute()

          const url = 'http://localhost:' + port + route;

          const chromeless = new Chromeless();

          const html = chromeless
            .goto(url)
            .then(() => chromeless.html()).then((html) => {
              callback(html);
              chromeless.end();
              Server.stop();
            });
        })
      })
    })
  }
  serveAndPrerenderRoute()
}
