/*
------------------------------------------------------------------------------
Copyright (c) Microsoft Corporation
All rights reserved.
Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0 
THIS CODE IS PROVIDED *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE, MERCHANTABLITY OR NON-INFRINGEMENT.
See the Apache Version 2.0 License for specific language governing permissions and limitations under the License.
------------------------------------------------------------------------------
*/

(function() {
    var ko = this.ko || require('../src/knockout-projections.js'),
        sampleData = ['Alpha', 'Beta', 'Gamma'];

    describe("Map", function () {

        it("returns a readonly computed observable array", function() {
            var sourceArray = ko.observableArray(sampleData.slice(0)),
                mappedArray = sourceArray.map(function(item) { return item.length; });

            expect(ko.isObservable(mappedArray)).toBe(true);
            expect(ko.isComputed(mappedArray)).toBe(true);
            expect(function() { mappedArray([1, 2, 3]); }).toThrow("Cannot write a value to a ko.computed unless you specify a 'write' option. If you wish to read the current value, don't pass any parameters.");
        });

        it("maps each entry in the array, returning a new observable array", function () {
            var sourceArray = ko.observableArray(sampleData.slice(0)),
                mappedArray = sourceArray.map(function(item) { return item.length; });
            expect(mappedArray()).toEqual([5, 4, 5]);
        });

        it("supports an alternative 'options' object syntax", function () {
            var sourceArray = ko.observableArray(sampleData.slice(0)),
                mappedArray = sourceArray.map({
                    mapping: function(item) { return item.length; }
                });
            expect(mappedArray()).toEqual([5, 4, 5]);
        });

        it("issues notifications when the underlying data changes, updating the mapped result", function () {
            var sourceArray = ko.observableArray(sampleData.slice(0)),
                mappedArray = sourceArray.map(function(item) { return item.length; }),
                log = [];
            mappedArray.subscribe(function(values) { log.push(values); });

            // Initial state is set without any notification
            expect(mappedArray()).toEqual([5, 4, 5]);
            expect(log.length).toBe(0);

            // Try adding an item
            sourceArray.push('Another');
            expect(log.length).toBe(1);
            expect(log[0]).toEqual([5, 4, 5, 7]);

            // Try removing an item
            sourceArray.splice(1, 1);
            expect(log.length).toBe(2);
            expect(log[1]).toEqual([5, 5, 7]);

            // Try mutating in place
            sourceArray()[1] = 'Modified';
            sourceArray.valueHasMutated();
            expect(log.length).toBe(3);
            expect(log[2]).toEqual([5, 8, 7]);
        });

        it("does not issue notifications for in-place edits if the mapping function returns the same object instance", function() {
            // With mapping, you should typically return new object instances each time from your mapping function.
            // If you preserve object instances we assume it's not a change you want to issue notification about.
            // When the mapping result is a primitive, this isn't controversial - there really isn't a change to notify.
            // When the mapping result is a nonprimitive it's less clear what semantics you intend, and arguably you
            // might have mutated that object's internal state and expect to notify about it. But that's such a strange
            // thing to be doing, with no clear use case, I think it's OK to suppress it. This could be changed
            // or made into an option in the future.

            var sourceArray = ko.observableArray([{ value: ko.observable('Alpha') }, { value: ko.observable('Beta') }]),
                mappedItem = { theItem: true },
                mappedArray = sourceArray.map(function(item) { return mappedItem; }),
                log = [];
            mappedArray.subscribe(function(values) { log.push(ko.toJSON(values)); });

            // Initial state
            expect(mappedArray()).toEqual([mappedItem, mappedItem]);
            expect(ko.toJSON(mappedArray)).toBe('[{"theItem":true},{"theItem":true}]');
            expect(log.length).toBe(0);

            // Since the mapping returns the same object instance, we don't treat it as a change to notify about
            sourceArray()[0].value('Alphalonger');
            expect(log.length).toBe(0);
            expect(ko.toJSON(mappedArray)).toBe('[{"theItem":true},{"theItem":true}]');
        });

        it("is possible to chain mappings", function() {
            var sourceArray = ko.observableArray(sampleData.slice(0)),
                mappedArray1 = sourceArray.map(function(item) { return item + item.toUpperCase(); }),
                mappedArray2 = mappedArray1.map(function(item) { return item.length; }),
                log1 = [],
                log2 = [];
            mappedArray1.subscribe(function(values) { log1.push(values); });
            mappedArray2.subscribe(function(values) { log2.push(values); });

            // Initial state is set without any notification
            expect(mappedArray1()).toEqual(['AlphaALPHA', 'BetaBETA', 'GammaGAMMA']);
            expect(mappedArray2()).toEqual([10, 8, 10]);
            expect(log1.length).toBe(0);
            expect(log2.length).toBe(0);

            // Try adding an item
            sourceArray.push('Another');
            expect(log1.length).toBe(1);
            expect(log2.length).toBe(1);
            expect(log1[0]).toEqual(['AlphaALPHA', 'BetaBETA', 'GammaGAMMA', 'AnotherANOTHER']);
            expect(log2[0]).toEqual([10, 8, 10, 14]);
        });

        it("only calls the mapping function for each newly added item", function() {
            var sourceArray = ko.observableArray(sampleData.slice(0)),
                mapCallsCount = 0,
                mappedArray = sourceArray.map(function(item) { mapCallsCount++; return item.length; }),
                originalMappedArrayInstance = mappedArray(),
                log = [];
            mappedArray.subscribe(function(values) { log.push(values); });

            // Initially the mapping is run for each item
            expect(mappedArray()).toEqual([5, 4, 5]);
            expect(mapCallsCount).toBe(3);

            // On add, only the new item is mapped, and the output is the same array instance
            sourceArray.push('Another');
            expect(mappedArray()).toBe(originalMappedArrayInstance);
            expect(mappedArray()).toEqual([5, 4, 5, 7]);
            expect(mapCallsCount).toBe(4);

            // Try multiple adds at once
            sourceArray.splice(2, 0, 'X', 'YZ');
            expect(mappedArray()).toEqual([5, 4, 1, 2, 5, 7]);
            expect(mapCallsCount).toBe(6);

            // On delete, doesn't need to map anything
            sourceArray.splice(2, 3);
            expect(mappedArray()).toEqual([5, 4, 7]);
            expect(mapCallsCount).toBe(6);

            // On move, doesn't need to map anything
            sourceArray(['Another', 'Beta']); // Delete 'Alpha', plus swap 'Another' and 'Beta'
            expect(mappedArray()).toEqual([7, 4]);
            expect(mapCallsCount).toBe(6);
        });

        it("responds to observable changes on individual items", function() {
            // Set up an array mapping in which individual items are observable
            var sourceArray = ko.observableArray([
                    { name: 'Bert', age: ko.observable(123) },
                    { name: 'Mollie', age: ko.observable(246) }
                ]),
                mapCallsCount = 0,
                mappedArray = sourceArray.map(function(item) {
                    mapCallsCount++;
                    return item.name + ' is age ' + item.age();
                }),
                log = [];
            mappedArray.subscribe(function(values) { log.push(values); });
            expect(log.length).toBe(0);
            expect(mapCallsCount).toBe(2);
            expect(mappedArray()).toEqual(['Bert is age 123', 'Mollie is age 246']);

            // Mutate one of the original items; see it affect the output
            sourceArray()[0].age(555);
            expect(log.length).toBe(1);
            expect(mapCallsCount).toBe(3);
            expect(mappedArray()).toEqual(['Bert is age 555', 'Mollie is age 246']);

            // Add a new item
            var megatron = { name: 'Megatron', age: ko.observable(6) };
            sourceArray.push(megatron);
            expect(log.length).toBe(2);
            expect(mapCallsCount).toBe(4);
            expect(mappedArray()).toEqual(['Bert is age 555', 'Mollie is age 246', 'Megatron is age 6']);

            // Mutate it; see it affect the output
            megatron.age(7);
            expect(log.length).toBe(3);
            expect(mapCallsCount).toBe(5);
            expect(mappedArray()).toEqual(['Bert is age 555', 'Mollie is age 246', 'Megatron is age 7']);            
        });

        it("supplies an observable index value that can be read in mappings", function() {
            var sourceArray = ko.observableArray(['Alpha', 'Beta']),
                mapCallsCount = 0,
                mappedArray = sourceArray.map(function(item, index) {
                    mapCallsCount++;
                    return "Item " + index() + " is " + item;
                });
            expect(mappedArray()).toEqual(['Item 0 is Alpha', 'Item 1 is Beta']);
            expect(mapCallsCount).toBe(2);

            // Check the index is given to newly-added items
            sourceArray.push('Gamma');
            expect(mappedArray()).toEqual(['Item 0 is Alpha', 'Item 1 is Beta', 'Item 2 is Gamma']);
            expect(mapCallsCount).toBe(3); // One new item

            // Check that indexes are updated when item positions are affected by deletions before them
            sourceArray.remove('Beta');
            expect(mappedArray()).toEqual(['Item 0 is Alpha', 'Item 1 is Gamma']);
            expect(mapCallsCount).toBe(4); // Re-mapped Gamma because index changed

            // Check that indexes are updated when item positions are affected by insertions before them
            sourceArray.splice(0, 0, 'First');
            expect(mappedArray()).toEqual(['Item 0 is First', 'Item 1 is Alpha', 'Item 2 is Gamma']);
            expect(mapCallsCount).toBe(7); // Mapped First (new) and remapped both others because indexes changed

            // Check that indexes are updated following a move
            sourceArray(['First', 'Gamma', 'Alpha']);
            expect(mappedArray()).toEqual(['Item 0 is First', 'Item 1 is Gamma', 'Item 2 is Alpha']);
            expect(mapCallsCount).toBe(9); // Remapped Alpha and Gamma because their indexes changed            
        });

        it("excludes any mapped values that match the private exclusion marker", function() {
            // The private exclusion marker is only for use by the 'filter' function.
            // It's only required to work in cases where the mapping does *not* reference index at all
            // (and therefore items can't be included/excluded based on index, which wouldn't be meaningful)

            var alpha = { name: 'Alpha', age: ko.observable(100) },
                beta = { name: 'Beta', age: ko.observable(101) },
                gamma = { name: 'Gamma', age: ko.observable(102) },
                delta = { name: 'Delta', age: ko.observable(103) },
                epsilon = { name: 'Epsilon', age: ko.observable(104) },
                sourceArray = ko.observableArray([alpha, beta, gamma]),
                mapCallsCount = 0,
                mappedArray = sourceArray.map(function(item, index) {
                    // Include only items with even age
                    mapCallsCount++;
                    return item.age() % 2 === 0 ? (index() + ': ' + item.name + ' is age ' + item.age()) : ko.projections._exclusionMarker;
                });
            expect(mappedArray()).toEqual(['0: Alpha is age 100', '1: Gamma is age 102']);
            expect(mapCallsCount).toBe(3); // All items mapped

            // Indexes still correctly reflect the filtered result after an item mutates
            gamma.age(200);
            expect(mappedArray()).toEqual(['0: Alpha is age 100', '1: Gamma is age 200']);
            expect(mapCallsCount).toBe(4); // Remapped Gamma only

            // Filtering and indexes are preserved when items are retained
            sourceArray.valueHasMutated();
            expect(mappedArray()).toEqual(['0: Alpha is age 100', '1: Gamma is age 200']);
            expect(mapCallsCount).toBe(4); // Nothing needed to be remapped

            // The filter applies to newly-added items too
            sourceArray.splice(3, 0, delta, epsilon);
            expect(mappedArray()).toEqual(['0: Alpha is age 100', '1: Gamma is age 200', '2: Epsilon is age 104']);
            expect(mapCallsCount).toBe(6); // Mapped the two new items

            // Mutating an excluded item doesn't affect the output (assuming it stays excluded)
            beta.age(201);
            expect(mappedArray()).toEqual(['0: Alpha is age 100', '1: Gamma is age 200', '2: Epsilon is age 104']);
            expect(mapCallsCount).toBe(7); // Remapped Beta only

            // The filter updates in response to item changes
            beta.age(300);
            expect(mappedArray()).toEqual(['0: Alpha is age 100', '1: Beta is age 300', '2: Gamma is age 200', '3: Epsilon is age 104']);
            expect(mapCallsCount).toBe(10); // Remapped Beta and its two subsequent items (their indexes changed)

            beta.age(301);
            expect(mappedArray()).toEqual(['0: Alpha is age 100', '1: Gamma is age 200', '2: Epsilon is age 104']);
            expect(mapCallsCount).toBe(13); // Remapped Beta and its two subsequent items (their indexes changed)

            // The filter is respected after moves. Previous order is [alpha, beta, gamma, delta, epsilon]
            sourceArray([alpha, beta, epsilon, gamma, delta]);
            expect(mappedArray()).toEqual(['0: Alpha is age 100', '1: Epsilon is age 104', '2: Gamma is age 200']);
            expect(mapCallsCount).toBe(15); // Epsilon and Gamma had their indexes changed
            
            // Note that in the above case, Delta isn't remapped at all, because last time its evaluator ran,
            // it returned the exclusion marker without even reading index(), so it has no dependency on index.
            // However, we can still bring it back and cause it to start responding to index changes:
            delta.age(500);
            expect(mappedArray()).toEqual(['0: Alpha is age 100', '1: Epsilon is age 104', '2: Gamma is age 200', '3: Delta is age 500']);
            expect(mapCallsCount).toBe(16); // Delta was remapped
            
            // Try an arbitrary more complex combination of moves too
            sourceArray([gamma, beta, alpha, delta, epsilon]);
            expect(mappedArray()).toEqual(['0: Gamma is age 200', '1: Alpha is age 100', '2: Delta is age 500', '3: Epsilon is age 104']);
            expect(mapCallsCount).toBe(20); // The four included items were remapped
        
            // Try deleting an item that was already filtered out
            sourceArray.splice(1, 1);
            expect(mappedArray()).toEqual(['0: Gamma is age 200', '1: Alpha is age 100', '2: Delta is age 500', '3: Epsilon is age 104']);
            expect(mapCallsCount).toBe(20); // No remapping needed        
        });

        it("disposes subscriptions when items are removed, and when the whole thing is disposed", function() {
            // Set up an array mapping in which individual items are observable
            var bert = { name: 'Bert', age: ko.observable(123) },
                mollie = { name: 'Mollie', age: ko.observable(246) },
                sourceArray = ko.observableArray([bert, mollie]),
                mappedArray = sourceArray.map(function(item) {
                    return item.name + ' is age ' + item.age();
                });
            expect(mappedArray()).toEqual(['Bert is age 123', 'Mollie is age 246']);
            expect(bert.age.getSubscriptionsCount()).toBe(1);
            expect(mollie.age.getSubscriptionsCount()).toBe(1);

            // One internal 'change' subscription needed to implement array change tracking,
            // plus one 'arrayChange' subscription needed for the mapping, so two in total.
            expect(sourceArray.getSubscriptionsCount()).toBe(2);

            // Removing an item from the array disposes any mapping subscription held for that item
            sourceArray.remove(bert);
            expect(sourceArray.getSubscriptionsCount()).toBe(2);
            expect(bert.age.getSubscriptionsCount()).toBe(0);
            expect(mollie.age.getSubscriptionsCount()).toBe(1);

            // Disposing the entire mapped array disposes everything
            mappedArray.dispose();
            expect(bert.age.getSubscriptionsCount()).toBe(0);
            expect(mollie.age.getSubscriptionsCount()).toBe(0);

            // KO core's internal 'change' subscription for trackArrayChanges is not disposed (but will be
            // GCed when the array itself is). A possible future optimization for KO core would be to
            // remove/re-add trackArrayChanges based on whether num(trackArrayChange subscriptions) is zero.
            expect(sourceArray.getSubscriptionsCount()).toBe(1); 
        });

        it("is possible to nest mappings", function() {
            var sourceArray = ko.observableArray([
                    { id: 1, items: ko.observableArray(['Alpha', 'Beta', 'Gamma']) },
                    { id: 2, items: ko.observableArray(['Delta']) },
                    { id: 3, items: ko.observableArray([]) }
                ]),
                outerMappingsCallCount = 0,
                innerMappingsCallCount = 0,
                mappedArray = sourceArray.map(function(data) {
                    outerMappingsCallCount++;
                    return {
                        id2: data.id,
                        things: data.items.map(function(item) {
                            innerMappingsCallCount++;
                            return { name: item };
                        })
                    }
                });

            expect(ko.toJS(mappedArray())).toEqual([
                { id2: 1, things: [{ name: 'Alpha' }, { name: 'Beta' }, { name: 'Gamma' }] },
                { id2: 2, things: [{ name: 'Delta' }] },
                { id2: 3, things: [] }
            ]);
            expect(outerMappingsCallCount).toBe(3);
            expect(innerMappingsCallCount).toBe(4);

            // Can mutate an inner item without causing re-mapping of outer items
            sourceArray()[1].items.push('Epsilon');
            expect(ko.toJS(mappedArray())).toEqual([
                { id2: 1, things: [{ name: 'Alpha' }, { name: 'Beta' }, { name: 'Gamma' }] },
                { id2: 2, things: [{ name: 'Delta' }, { name: 'Epsilon' }] },
                { id2: 3, things: [] }
            ]);
            expect(outerMappingsCallCount).toBe(3);
            expect(innerMappingsCallCount).toBe(5);

            // Can mutate an outer item and only cause re-mapping of its children
            sourceArray.splice(1, 1, { id: 'new', items: ko.observableArray(['NewChild1', 'NewChild2']) });
            expect(ko.toJS(mappedArray())).toEqual([
                { id2: 1, things: [{ name: 'Alpha' }, { name: 'Beta' }, { name: 'Gamma' }] },
                { id2: 'new', things: [{ name: 'NewChild1' }, { name: 'NewChild2' }] },
                { id2: 3, things: [] }
            ]);
            expect(outerMappingsCallCount).toBe(4);
            expect(innerMappingsCallCount).toBe(7);
        });

        it("is possible to provide a 'disposeItem' option to clear up the mapped object", function() {
            var modelItem = {
                    name: ko.observable('Annie')
                },
                underlyingArray = ko.observableArray(),
                disposedItems = [],
                mappedArray = underlyingArray.map({
                    mapping: function(item) {
                        return {
                            nameUpper: ko.computed(function() {
                                return item.name().toUpperCase();
                            })
                        };
                    },
                    disposeItem: function(mappedItem) {
                        disposedItems.push(mappedItem.nameUpper());
                        mappedItem.nameUpper.dispose();
                    }
                });

            // See that each mapped item causes a subscription on the underlying observable
            expect(modelItem.name.getSubscriptionsCount()).toBe(0);
            underlyingArray.push(modelItem);
            underlyingArray.push(modelItem);
            expect(modelItem.name.getSubscriptionsCount()).toBe(2);

            // See that removing items causes subscriptions to be disposed
            underlyingArray.pop();
            expect(modelItem.name.getSubscriptionsCount()).toBe(1);
            expect(disposedItems).toEqual(['ANNIE']);

            // See that mutating the observable doesn't affect its subscription count
            modelItem.name('Clarabel');
            expect(ko.toJS(mappedArray)).toEqual([{ nameUpper: 'CLARABEL' }]);
            expect(modelItem.name.getSubscriptionsCount()).toBe(1);

            // See that disposing the whole mapped array also triggers the disposeItem callbacks
            mappedArray.dispose();
            expect(modelItem.name.getSubscriptionsCount()).toBe(0);
            expect(disposedItems).toEqual(['ANNIE', 'CLARABEL']);            
        });

        it("calls 'disposeItem' when items are being replaced in-place", function() {
            var modelItem1 = { name: ko.observable('Annie') },
                modelItem2 = { name: ko.observable('Clarabel') },
                underlyingArray = ko.observableArray(),
                disposedItemsIndices = [],
                mappedItemNextIndex = 0,
                mappedArray = underlyingArray.map({
                    mapping: function(item) {
                        // Notice there is no extra layer of observability here
                        // (no ko.computed), so when 'name' changes, this entire
                        // mapped entry has to get replaced.
                        return { nameUpper: item.name().toUpperCase(), mappedItemIndex: mappedItemNextIndex++ };
                    },
                    disposeItem: function(mappedItem) {
                        disposedItemsIndices.push(mappedItem.mappedItemIndex);
                    }
                });

            underlyingArray.push(modelItem1);
            underlyingArray.push(modelItem2);
            expect(mappedArray()).toEqual([
                { nameUpper: 'ANNIE', mappedItemIndex: 0 },
                { nameUpper: 'CLARABEL', mappedItemIndex: 1 }
            ]);
            expect(disposedItemsIndices).toEqual([]);

            // See that replacing in-place causes disposeItem to fire
            modelItem2.name('ClarabelMutated');
            expect(mappedArray()).toEqual([
                { nameUpper: 'ANNIE', mappedItemIndex: 0 },
                { nameUpper: 'CLARABELMUTATED', mappedItemIndex: 2 }
            ]);
            expect(disposedItemsIndices).toEqual([1]);

            // See that reordering does not trigger any disposeItem calls
            underlyingArray.reverse();
            expect(mappedArray()).toEqual([
                { nameUpper: 'CLARABELMUTATED', mappedItemIndex: 2 },
                { nameUpper: 'ANNIE', mappedItemIndex: 0 }
            ]);
            expect(disposedItemsIndices).toEqual([1]);

            // See that actual removal does trigger a disposeItem call
            underlyingArray.shift();
            expect(mappedArray()).toEqual([
                { nameUpper: 'ANNIE', mappedItemIndex: 0 }
            ]);
            expect(disposedItemsIndices).toEqual([1, 2]);
        });

        it("is possible to provide a 'mappingWithDisposeCallback' option to combine both 'mapping' and 'disposeItem' in one", function() {
            // If you 'mapping' callback wants to create some per-item resource that needs disposal,
            // but that item is not the mapping result itself, then you would struggle to implement
            // the disposal because 'disposeItem' only gives you the mapping result, and not any
            // other context that helps you find the other per-item resource you created.
            // To solve this, 'mappingWithDisposeCallback' is an alternative to 'mapping'. Your return
            // value should be an object of the form { mappedValue: ..., dispose: function() { ... } },
            // and then the 'dispose' callback will be invoked when the mappedValue should be disposed.

            var underlyingArray = ko.observableArray([
                    { name: ko.observable('alpha') },
                    { name: ko.observable('beta') },
                    { name: ko.observable('gamma') }
                ]),
                alphaObject = underlyingArray()[0],
                perItemResources = {},
                mappedArray = underlyingArray.map({
                    mappingWithDisposeCallback: function(value, index) {
                        var name = value.name();
                        perItemResources[name] = { disposed: false };

                        return {
                            mappedValue: name.toUpperCase(),
                            dispose: function() { perItemResources[name].disposed = true; }
                        };
                    }
                });
            
            expect(mappedArray()).toEqual(['ALPHA', 'BETA', 'GAMMA']);
            expect(perItemResources).toEqual({
                alpha: { disposed: false },
                beta: { disposed: false },
                gamma: { disposed: false }
            });

            // See that removal triggers the per-item dispose callback
            underlyingArray.splice(1, 1);
            expect(mappedArray()).toEqual(['ALPHA', 'GAMMA']);
            expect(perItemResources).toEqual({
                alpha: { disposed: false },
                beta: { disposed: true },
                gamma: { disposed: false }
            });

            // See that reordering does not trigger the per-item dispose callback
            underlyingArray.reverse();
            expect(mappedArray()).toEqual(['GAMMA', 'ALPHA']);
            expect(perItemResources).toEqual({
                alpha: { disposed: false },
                beta: { disposed: true },
                gamma: { disposed: false }
            });

            // See that replace-in-place does trigger the per-item dispose callback
            alphaObject.name('replaced');
            expect(mappedArray()).toEqual(['GAMMA', 'REPLACED']);
            expect(perItemResources).toEqual({
                alpha: { disposed: true },
                beta: { disposed: true },
                gamma: { disposed: false },
                replaced: { disposed: false }
            });
        });

        it("will attempt to disposed mapped items on every evaluation, even if the evaluator returns the same object instances each time", function() {
            // It would be unusual to have a mapping evaluator that returns the same object instances each time
            // it is called, but if you do that, we will still tell you to dispose the item before every evaluation
            var underlyingArray = ko.observableArray([1, 2, 3]),
                constantMappedValue = { theMappedValue: true },
                disposeCount = 0,
                mappedArray = underlyingArray.map({
                    mappingWithDisposeCallback: function(item) {
                        return {
                            mappedValue: constantMappedValue,
                            dispose: function() {
                                disposeCount++;
                            }
                        }
                    }
                });

            expect(mappedArray()).toEqual([constantMappedValue, constantMappedValue, constantMappedValue]);
            expect(disposeCount).toEqual(0);

            // Adding items doesn't trigger disposal
            underlyingArray.push(4);
            expect(mappedArray()).toEqual([constantMappedValue, constantMappedValue, constantMappedValue, constantMappedValue]);
            expect(disposeCount).toEqual(0);

            // Removing items does
            underlyingArray.splice(1, 2);
            expect(mappedArray()).toEqual([constantMappedValue, constantMappedValue]);
            expect(disposeCount).toEqual(2);

            // Reordering items does not
            underlyingArray.reverse();
            expect(mappedArray()).toEqual([constantMappedValue, constantMappedValue]);
            expect(disposeCount).toEqual(2);

            // Replacing items does
            underlyingArray([5, 6]);
            expect(mappedArray()).toEqual([constantMappedValue, constantMappedValue]);
            expect(disposeCount).toEqual(4);

            // Disposing the entire mapped array does
            mappedArray.dispose();
            expect(mappedArray()).toEqual([constantMappedValue, constantMappedValue]);
            expect(disposeCount).toEqual(6);
        });

        it("is mandatory to specify 'mapping' or 'mappingWithDisposeCallback'", function() {
            var underlyingArray = ko.observableArray([1, 2, 3]);

            expect(function() {
                underlyingArray.map({ /* empty options */ });
            }).toThrow('Specify either \'mapping\' or \'mappingWithDisposeCallback\'.');
        });

        it("is not allowed to specify 'mappingWithDisposeCallback' in conjunction with 'mapping' or 'disposeItem'", function() {
            var underlyingArray = ko.observableArray([1, 2, 3]);

            expect(function() {
                underlyingArray.map({
                    mapping: function() {  },
                    mappingWithDisposeCallback: function() {  }
                });
            }).toThrow('\'mappingWithDisposeCallback\' cannot be used in conjunction with \'mapping\' or \'disposeItem\'.');

            expect(function() {
                underlyingArray.map({
                    disposeItem: function() {  },
                    mappingWithDisposeCallback: function() {  }
                });
            }).toThrow('\'mappingWithDisposeCallback\' cannot be used in conjunction with \'mapping\' or \'disposeItem\'.');
        });
    });
})();
