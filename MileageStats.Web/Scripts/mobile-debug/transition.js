﻿/*  
Copyright Microsoft Corporation

Licensed under the Apache License, Version 2.0 (the "License"); you may not
use this file except in compliance with the License. You may obtain a copy of
the License at 

http://www.apache.org/licenses/LICENSE-2.0 

THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED 
WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE, 
MERCHANTABLITY OR NON-INFRINGEMENT. 

See the Apache 2 License for the specific language governing permissions and
limitations under the License. */

(window.mstats = window.mstats || {}).transition = function (require) {

    var templating = require('Mustache'),
        document = require('document'),
        rootUrl = require('rootUrl'),
        window = require('window'),
        app = require('mstats'),
        notifications = require('notifications'),
        ajax = require('ajax'),
        $ = require('$');

    var cssClassForTransition = 'swapping';

    function transitionTo(target, defaultRegion, namedParametersPattern, callback) {

        var registration = target.registration,
            region = registration.region || defaultRegion,
            host = $(region, document),
            route = registration.route;

        var template = getTemplateFor(route, namedParametersPattern);
        var onSuccess = success(host, template, target, callback);

        host.removeClass(cssClassForTransition).addClass(cssClassForTransition);

        if (registration.fetch && !mstats.initialModel) {

            ajax.request({
                dataType: 'json',
                type: 'GET',
                url: appendJsonFormat(makeRelativeToRoot(target.url)),
                success: onSuccess,
                cache: false,
                error: error(host)
            });

        } else {
            var response = {
                Model: app.initialModel
            };
            app.initialModel = null;
            onSuccess(response);
        }
    }

    function success(host, template, target, callback) {

        var registration = target.registration;

        return function (model, status, xhr) {

            var view, el;

            // Append route data to the model. 
            // We use the well known name '__route__'
            // assuming that it will be unlikely to
            // collide with any existing properties.
            model.__route__ = target.params;

            if (registration.prerender) {
                model = registration.prerender(model);
            }

            view = templating.to_html(template, model);
            host.empty();
            host.append(view);
            el = host.children().last();

            if (registration.postrender) {
                registration.postrender(model, el, target);
            }

            notifications.renderTo(host);

            host.removeClass(cssClassForTransition);

            if (callback) callback(model, el);
        };
    }

    function error(host) {

        return function (xhr, status, errorThrown) {
            if (xhr.status == 401) {
                window.location = rootUrl;
            }

            host.empty();
            host.append('<div>' + status + ': ' + errorThrown + '</div>');
        };
    }

    function makeRelativeToRoot(url) {
        return (rootUrl + url).replace('//', '/');
    }

    function appendJsonFormat(url) {
        if (url.indexOf('?') > 0) {
            return url + '&format=json';
        }
        else {
            return url + '?format=json';
        }
    }

    function getTemplateFor(route, namedParametersPattern) {

        // templateId could be cached at registration

        var id = '#' + route
            .replace(namedParametersPattern, '')    // remove named parameters
            .replace(/^\//, '')                     // remove leading /
            .replace(/\//g, '-').toLowerCase()      // convert / to  -
            .replace(/--/g, '-')                    // collapse double -
            .replace(/-$/, ''); // remove trailing -

        var template = $(id, document);
        if (template.length === 0) {
            return '<h1>No Template Found!</h1><h2>' + id + '</h2>';
        }
        return template.html();
    }

    return {
        to: transitionTo
    };

};