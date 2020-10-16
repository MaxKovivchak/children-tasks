(function($) {
    "use strict";

    function Sortable(el, options) {
        var self = this,
            $sortable = $(el),
            container_type = $sortable[0].nodeName,
            node_type = (container_type == 'OL' || container_type == 'UL') ? 'LI' : 'DIV',
            defaults = {
                //options
                handle: false,
                container: container_type,
                container_type: container_type,
                same_depth: false,
                make_unselectable: false,
                nodes: node_type,
                nodes_type: node_type,
                placeholder_class: null,
                auto_container_class: 'sortable_container',
                autocreate: false,
                group: false,
                scroll: false,
                withReplace: false,
                //callbacks
                update: null
            };

        self.$sortable = $sortable.data('sortable', self);
        self.options = $.extend({}, defaults, options);

        self.init();
    }

    Sortable.prototype.invoke = function(command) {
        var self = this;
        if (command === 'destroy') {
            return self.destroy();
        } else if (command === 'serialize') {
            return self.serialize(self.$sortable);
        }
    };

    Sortable.prototype.init = function() {
        var self = this,
            $clone,
            $placeholder,
            origin,
            dragIndex,
            verticalDirection;

        if (self.options.make_unselectable) {
            $('html').unselectable();
        }

        self.$sortable
            .addClass('sortable')
            .on('destroy.sortable', function() {
                self.destroy();
            });

        function find_insert_point($node, offset) {
            var containers,
                best,
                depth;

            if (!offset) {
                return;
            }

            containers = self.$sortable
                .add(self.$sortable.find(self.options.container))
                .not($node.find(self.options.container))
                .not($clone.find(self.options.container))
                .not(self.find_nodes());

            if (self.options.same_depth) {
                depth = $node.parent().nestingDepth('ul');
                containers = containers.filter(function() {
                    return $(this).nestingDepth('ul') == depth;
                });
            }

            $placeholder.hide();
            containers.each(function(ix, container) {
                var $trailing = $(self.create_placeholder()).appendTo(container),
                    $children = $(container).children(self.options.nodes).not('.sortable_clone'),
                    $candidate,
                    n,
                    dist;

                for (n = 0; n < $children.length; n++) {
                    $candidate = $children.eq(n);
                    dist = self.square_dist($candidate.offset(), offset);
                    if (!best || best.dist > dist) {
                        best = {
                            container: container,
                            before: verticalDirection === 'down' && self.options.withReplace ? $children.eq(n-1) : $candidate[0],
                            dist: dist
                        };
                    }
                }

                $trailing.remove();
            });
            $placeholder.show();

            return best;
        }

        function insert($element, best) {
            var $container = $(best.container);
            if (best.before && best.before.closest('html')) {
                if (self.options.withReplace) {
                    $(best.before).replaceWith($element);
                } else {
                    $element.insertBefore(best.before);
                }
            } else {
                if (!self.options.withReplace) {
                    $element.appendTo($container);
                }
            }
        }

        self.$sortable.dragaware($.extend({}, self.options, {
            delegate: self.options.nodes,
            /**
             * drag start - create clone and placeholder, keep drag start origin.
             */
            dragstart: function(evt) {
                var $node = $(this);

                if (self.options.withReplace) {
                    self.find_nodes().each((idx, el) => {
                        if ($(el).html().length) {
                            if (el.firstElementChild.value === $node[0].firstElementChild.value) {
                                dragIndex = idx
                            }
                        }
                    })
                }

                $clone = $node.clone()
                    .removeAttr('id')
                    .addClass('sortable_clone')
                    .css({position: 'absolute'})
                    .insertAfter($node)
                    .offset($node.offset());
                $placeholder = self.create_placeholder()
                    .css({height: $node.outerHeight(), width: $node.outerWidth()})
                    .insertAfter($node);
                $node.hide();

                origin = new PositionHelper($clone.offset());

                if (self.options.autocreate) {
                    self.find_nodes().filter(function(ix, el) {
                        return $(el).find(self.options.container).length == 0;
                    }).append('<' + self.options.container_type + ' class="' + self.options.auto_container_class + '"/>');
                }
            },

            /**
             * drag - reposition clone, check for best insert position, move placeholder in dom accordingly.
             */
            drag: function(evt, pos) {
                var $node = $(this),
                    offset = origin.absolutize(pos),
                    best = find_insert_point($node, offset);

                verticalDirection = pos.dY > 0 ? 'down' : 'up'

                $clone.offset(offset);

                if (self.options.withReplace) {
                    $(best.container.children).each(function (_, el) {
                        if ($(el).html().length) {
                            $(el).removeClass('sortable_placeholder')
                        }
                    })
                    $(best.before).addClass('sortable_placeholder');
                } else {
                    insert($placeholder, best);
                }
            },

            /**
             * drag stop - clean up.
             */
            dragstop: function(evt, pos) {
                var $node = $(this),
                    offset = origin.absolutize(pos),
                    best = find_insert_point($node, offset);

                if (best) {
                    insert($node, best);
                }
                $node.show();

                if ($clone) {
                    $clone.remove();
                }
                if ($placeholder) {
                    $placeholder.remove();
                }
                $clone = null;
                $placeholder = null;

                if (self.options.withReplace) {
                    verticalDirection === 'up'
                        ? $(best.container.children).eq(dragIndex - 1).after(best.before)
                        : $(best.container.children).eq(dragIndex).before(best.before)

                    $(best.container.children).each(function (_, el) {
                        if ($(el).html().length) {
                            $(el).removeClass('sortable_placeholder')
                        }
                    })
                    $(best.container).find('li.sortable_placeholder').remove();
                }

                if (best && self.options.update) {
                    self.options.update.call(self.$sortable, evt, self);
                }
                self.$sortable.trigger('update');
            }
        }));
    };

    Sortable.prototype.destroy = function() {
        var self = this;

        if (self.options.make_unselectable) {
            $('html').unselectable('destroy');
        }

        self.$sortable
            .removeClass('sortable')
            .off('.sortable')
            .dragaware('destroy');
    };

    Sortable.prototype.serialize = function(container) {
        var self = this;
        return container.children(self.options.nodes)
            .not(self.options.container)
            .map(function(ix, el) {
                var $el = $(el),
                    text = $el.clone().children().remove().end().text().trim(), //text only without children
                    id = $el.attr('id'),
                    node = {id: id || text};
                if ($el.find(self.options.nodes).length) {
                    node.children = self.serialize($el.children(self.options.container));
                }
                return node;
            })
            .get();
    };

    Sortable.prototype.find_nodes = function() {
        var self = this;
        return self.$sortable.find(self.options.nodes).not(self.options.container);
    };

    Sortable.prototype.create_placeholder = function() {
        var self = this;
        return $('<' + self.options.nodes_type + '/>')
            .addClass('sortable_placeholder')
            .addClass(self.options.placeholder_class);
    };

    Sortable.prototype.square_dist = function(pos1, pos2) {
        return Math.pow(pos2.left - pos1.left, 2) + Math.pow(pos2.top - pos1.top, 2);
    };

    function Dragaware(el, options) {
        var $dragaware = $(el),
            $reference = null,
            origin = null,
            lastpos = null,
            defaults = {
                //options
                handle: null,
                delegate: null,
                scroll: false,
                scrollspeed: 15,
                scrolltimeout: 50,
                //callbacks
                dragstart: null,
                drag: null,
                dragstop: null
            },
            scrolltimeout;

        options = $.extend({}, defaults, options);

        /**
         * Returns the event position
         * dX, dY relative to drag start
         * pageX, pageY relative to document
         * clientX, clientY relative to browser window
         */
        function evtpos(evt) {
            evt = window.hasOwnProperty('event') ? window.event : evt;
            //extract touch event if present
            if (evt.type.substr(0, 5) === 'touch') {
                evt = evt.hasOwnProperty('originalEvent') ? evt.originalEvent : evt;
                evt = evt.touches[0];
            }

            return {
                pageX: evt.pageX,
                pageY: evt.pageY,
                clientX: evt.clientX,
                clientY: evt.clientY,
                dX: origin ? evt.pageX - origin.pageX : 0,
                dY: origin ? evt.pageY - origin.pageY : 0
            };
        }

        function autoscroll(pos) {
            //TODO: allow window scrolling
            //TODO: handle nested scroll containers
            var sp = $dragaware.scrollParent(),
                mouse = {x: pos.pageX, y: pos.pageY},
                offset = sp.offset(),
                scrollLeft = sp.scrollLeft(),
                scrollTop = sp.scrollTop(),
                width = sp.width(),
                height = sp.height();

            window.clearTimeout(scrolltimeout);

            if (scrollLeft > 0 && mouse.x < offset.left) {
                sp.scrollLeft(scrollLeft - options.scrollspeed);
            } else if (scrollLeft < sp.prop('scrollWidth') - width && mouse.x > offset.left + width) {
                sp.scrollLeft(scrollLeft + options.scrollspeed);
            } else if (scrollTop > 0 && mouse.y < offset.top) {
                sp.scrollTop(scrollTop - options.scrollspeed);
            } else if (scrollTop < sp.prop('scrollHeight') - height && mouse.y > offset.top + height) {
                sp.scrollTop(scrollTop + options.scrollspeed);
            } else {
                return; //so we don't set the next timeout
            }

            scrolltimeout = window.setTimeout(function() { autoscroll(pos); }, options.scrolltimeout);
        }

        function start(evt) {
            var $target = $(evt.target);

            $reference = options.delegate ? $target.closest(options.delegate) : $dragaware;

            if ($target.closest(options.handle || '*').length && (evt.type == 'touchstart' || evt.button == 0)) {
                origin = lastpos = evtpos(evt);
                if (options.dragstart) {
                    options.dragstart.call($reference, evt, lastpos);
                }

                $reference.addClass('dragging');
                $reference.trigger('dragstart');

                //late binding of event listeners
                $(document)
                    .on('touchend.dragaware mouseup.dragaware click.dragaware', end)
                    .on('touchmove.dragaware mousemove.dragaware', move);
                return false
            }
        }

        function move(evt) {
            lastpos = evtpos(evt);

            if (options.scroll) {
                autoscroll(lastpos);
            }

            $reference.trigger('dragging');

            if (options.drag) {
                options.drag.call($reference, evt, lastpos);
                return false;
            }
        }

        function end(evt) {
            window.clearTimeout(scrolltimeout);

            if (options.dragstop) {
                options.dragstop.call($reference, evt, lastpos);
            }

            $reference.removeClass('dragging');
            $reference.trigger('dragstop');

            origin = false;
            lastpos = false;
            $reference = false;

            //unbinding of event listeners
            $(document)
                .off('.dragaware');

            return false;
        }

        $dragaware
            .addClass('dragaware')
            .on('touchstart.dragaware mousedown.dragaware', options.delegate, start);

        $dragaware.on('destroy.dragaware', function() {
            $dragaware
                .removeClass('dragaware')
                .off('.dragaware');
        });
    }

    function PositionHelper(origin) {
        this.origin = origin;
    }

    PositionHelper.prototype.absolutize = function(pos) {
        if (!pos) {
            return this.origin;
        }
        return {top: this.origin.top + pos.dY, left: this.origin.left + pos.dX};
    };


    /**
     * Plugin registration.
     */
    $.fn.sortable = function(options) {
        var filtered = this.not(function() {
            return $(this).is('.sortable') || $(this).closest('.sortable').length;
        });

        if (this.data('sortable') && typeof options === 'string') {
            return this.data('sortable').invoke(options);
        }

        if (filtered.length && options && options.group) {
            new Sortable(filtered, options);
        } else {
            filtered.each(function(ix, el) {
                new Sortable(el, options);
            });
        }
        return this;
    };

    /**
     * Dragaware plugin.
     */
    $.fn.dragaware = function(options) {
        if (options === 'destroy') {
            this.trigger('destroy.dragaware');
        } else {
            this.not('.dragaware').each(function(ix, el) {
                new Dragaware(el, options);
            });
        }
        return this;
    };

    /**
     * Disables mouse selection.
     */
    $.fn.unselectable = function(command) {
        function disable() {
            return false;
        }

        if (command == 'destroy') {
            return this
                .removeClass('unselectable')
                .removeAttr('unselectable')
                .off('selectstart.unselectable');
        } else {
            return this
                .addClass('unselectable')
                .attr('unselectable','on')
                .on('selectstart.unselectable', disable);
        }
    };

    $.fn.invisible = function() {
        return this.css({visibility: 'hidden'});
    };

    $.fn.visible = function() {
        return this.css({visibility: 'visible'});
    };

    $.fn.scrollParent = function() {
        return this.parents().addBack().filter(function() {
            var p = $(this);
            return (/(scroll|auto)/).test(p.css("overflow-x") + p.css("overflow-y") + p.css("overflow"));
        });
    };

    $.fn.nestingDepth = function(selector) {
        var parent = this.parent().closest(selector || '*');
        if (parent.length) {
            return parent.nestingDepth(selector) + 1;
        } else {
            return 0;
        }
    };

}(jQuery));
