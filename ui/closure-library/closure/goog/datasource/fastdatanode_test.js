// Copyright 2006 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

goog.provide('goog.ds.FastDataNodeTest');
goog.setTestOnly('goog.ds.FastDataNodeTest');

goog.require('goog.array');
goog.require('goog.ds.DataManager');
goog.require('goog.ds.Expr');
goog.require('goog.ds.FastDataNode');
goog.require('goog.testing.jsunit');

var simpleObject;
var complexObject;
var dataChangeEvents;

function setUp() {
  simpleObject = {Name: 'Jon Doe', Email: 'jon.doe@gmail.com'};
  complexObject = {
    Name: 'Jon Doe',
    Email: 'jon.doe@gmail.com',
    Emails: [
      {Address: 'jon.doe@gmail.com', Type: 'Home'},
      {Address: 'jon.doe@workplace.com', Type: 'Work'}
    ],
    GroupIds: [23, 42]
  };
  var dm = goog.ds.DataManager.getInstance();
  dataChangeEvents = [];
  dm.fireDataChange = function(dataPath) { dataChangeEvents.push(dataPath); };
}

function tearDown() {
  goog.ds.DataManager.clearInstance();
}

function testGetChildNodeValue() {
  var node = new goog.ds.FastDataNode(simpleObject, 'Simple');
  var value = node.getChildNodeValue('Name');
  assert(goog.isString(value));
  assertEquals('Jon Doe', value);
}

function testDataNameAndPath() {
  var node = new goog.ds.FastDataNode(simpleObject, 'Simple');
  assertEquals('DataName should be \'Simple\'', 'Simple', node.getDataName());
  assertEquals('DataPath should be \'Simple\'', 'Simple', node.getDataPath());
}

function testStringChildNode() {
  var node = goog.ds.FastDataNode.fromJs(simpleObject, 'Simple');
  var name = node.getChildNode('Name');
  var email = node.getChildNode('Email');
  assertEquals('Jon Doe', name.get());
  assertEquals('jon.doe@gmail.com', email.get());

  assertEquals('Name', name.getDataName());
  assertEquals('Simple/Name', name.getDataPath());

  assertEquals('Email', email.getDataName());
  assertEquals('Simple/Email', email.getDataPath());
}

function testGetChildNodes() {
  var node = goog.ds.FastDataNode.fromJs(simpleObject, 'Simple');
  var children = node.getChildNodes();
  assertEquals(2, children.getCount());
  var childValues = [];
  for (var i = 0; i < 2; ++i) {
    childValues.push(children.getByIndex(i).get());
  }
  goog.array.sort(childValues);
  assertEquals('Jon Doe', childValues[0]);
  assertEquals('jon.doe@gmail.com', childValues[1]);
}


function testGetDistinguishesBetweenOverloads() {
  var node = goog.ds.FastDataNode.fromJs(simpleObject, 'Simple');
  assertEquals(node, node.get());
  assertEquals('Jon Doe', node.getChildNodes().get('Name').get());
}


function testGetChildNodesForPrimitiveNodes() {
  var node = goog.ds.FastDataNode.fromJs(simpleObject, 'Simple');
  var children = node.getChildNode('Name').getChildNodes();
  assertEquals(0, children.getCount());
}


function testFastListNode() {
  var node = goog.ds.FastDataNode.fromJs(complexObject, 'Object');
  assertEquals('Jon Doe', node.getChildNodeValue('Name'));
  var emails = node.getChildNode('Emails');
  assertEquals(
      'jon.doe@gmail.com',
      emails.getChildNode('[0]').getChildNodeValue('Address'));
  assertEquals(
      'jon.doe@workplace.com',
      emails.getChildNode('[1]').getChildNodeValue('Address'));

  assertEquals(
      'Object/Emails/[0]/Address',
      emails.getChildNode('[0]').getChildNode('Address').getDataPath());

  var groups = node.getChildNode('GroupIds');
  assertEquals(23, groups.getChildNode('[0]').get());
  assertEquals(42, groups.getChildNodeValue('[1]'));

  var childValues = emails.getChildNodes();
  assertEquals(2, childValues.getCount());
  assertEquals(
      'jon.doe@gmail.com',
      childValues.getByIndex(0).getChildNodeValue('Address'));
}


function testChildNodeValueForNonexistantAttribute() {
  var node = goog.ds.FastDataNode.fromJs(complexObject, 'Object');
  assertNull(node.getChildNodeValue('DoesNotExist'));
  assertNull(node.getChildNode('Emails').getChildNodeValue('[666]'));
}


function testAllChildrenSelector() {
  var node = goog.ds.FastDataNode.fromJs(complexObject, 'Object');
  var allChildren = node.getChildNodes('*');
  assertEquals(4, allChildren.getCount());

  // not implemented, yet
  // var nameChild = node.getChildNodes('Name');
  // assertEquals(1, allChildren.getCount());
}

function testExpression() {
  var node = goog.ds.FastDataNode.fromJs(complexObject, 'Object');
  assertEquals('Jon Doe', goog.ds.Expr.create('Name').getValue(node));
  assertEquals(
      'jon.doe@workplace.com',
      goog.ds.Expr.create('Emails/[1]/Address').getNode(node).get());
  var emails = goog.ds.Expr.create('Emails/*').getNodes(node);
  assertEquals(2, emails.getCount());
  assertEquals(
      'jon.doe@workplace.com',
      emails.getByIndex(1).getChildNodeValue('Address'));
}

function testModifyNode() {
  var node = goog.ds.FastDataNode.fromJs(complexObject, 'Object');
  node.getChildNode('Name').set('Foo Bar');
  assertEquals('Foo Bar', node.getChildNodeValue('Name'));
}

function testClone() {
  var node = goog.ds.FastDataNode.fromJs(complexObject, 'Object');
  var clone = node.clone();
  node.getChildNode('Name').set('Foo Bar');
  assertEquals('Jon Doe', clone.getChildNodeValue('Name'));
  var expr = goog.ds.Expr.create('Emails/[1]/Address');
  expr.getNode(clone).set('jon@doe.com');
  assertEquals('jon.doe@workplace.com', expr.getValue(node));
  assertEquals('jon@doe.com', expr.getValue(clone));
}

function testSetChildNodeOnList() {
  var list = goog.ds.FastDataNode.fromJs([], 'list');
  var node = goog.ds.FastDataNode.fromJs({Id: '42', Name: 'Foo'}, '42', list);
  list.setChildNode('42', node);

  assertEquals(node, list.getChildNode('42'));
  assertEquals(node, list.getChildNodes().getByIndex(0));
  assertEquals(node, list.getChildNodes().get('42'));
}

function testCreateNewValueWithSetChildNode() {
  var node = goog.ds.FastDataNode.fromJs({}, 'object');
  node.setChildNode('Foo', 'Bar');
  assertEquals('Bar', node.getChildNodeValue('Foo'));
}


function testSetChildNotWithNull_object() {
  var node = new goog.ds.FastDataNode({Foo: 'Bar'}, 'test');
  node.setChildNode('Foo', null);
  assertNull('node should not have a Foo child', node.getChildNode('Foo'));
  assertEquals(
      'node should not have any children', 0, node.getChildNodes().getCount());
}

function testSetChildNotWithNull_list() {
  var list = goog.ds.FastDataNode.fromJs([], 'list');
  list.setChildNode('foo', 'bar');
  list.setChildNode('gee', 'wizz');
  assertEquals('bar', list.getChildNodeValue('foo'));
  assertEquals('wizz', list.getChildNodes().getByIndex(1).get());
  list.setChildNode('foo', null);
  assertEquals(1, list.getChildNodes().getCount());
  assertEquals('wizz', list.getChildNodeValue('gee'));
  assertEquals('wizz', list.getChildNodes().getByIndex(0).get());
}

function testNodeListIndexesOnId() {
  var list = goog.ds.FastDataNode.fromJs([{id: '^Freq', value: 'foo'}], 'list');
  assertEquals('foo', list.getChildNode('^Freq').getChildNodeValue('value'));
  list.setChildNode('^Temp', {id: '^Temp', value: 'bar'});
  assertEquals('bar', list.getChildNode('^Temp').getChildNodeValue('value'));
}

function verifyDataChangeEvents(expected) {
  assertEquals(expected.length, dataChangeEvents.length);
  for (var i = 0; i < expected.length; ++i) {
    assertEquals(expected[i], dataChangeEvents[i]);
  }
  dataChangeEvents = [];
}

function testFireDataChangeOnSet() {
  var node = new goog.ds.FastDataNode(simpleObject, 'Simple');
  node.getChildNode('Name').set('Foo Bar');
  verifyDataChangeEvents(['Simple/Name']);
}

function testFireDataChangeOnSetChildNode_object() {
  var node = new goog.ds.FastDataNode(simpleObject, 'Simple');
  node.setChildNode('Name', 'Foo Bar');
  node.setChildNode('Email', null);
  verifyDataChangeEvents(['Simple/Name', 'Simple/Email']);
}

function testFireDataChangeOnSetChildNode_list() {
  var node = new goog.ds.FastDataNode(complexObject, 'Node');
  node.getChildNode('GroupIds').setChildNode('[0]', 1001);
  verifyDataChangeEvents(['Node/GroupIds/[0]']);

  node.getChildNode('GroupIds').getChildNodes().add(1002);
  verifyDataChangeEvents(
      ['Node/GroupIds/[2]', 'Node/GroupIds', 'Node/GroupIds/count()']);

  node.getChildNode('GroupIds').setChildNode('foo', 1003);
  verifyDataChangeEvents(
      ['Node/GroupIds/foo', 'Node/GroupIds', 'Node/GroupIds/count()']);
}
