var assert = require('assert');
var mongoose = require("mongoose");
var user = require("../lib/user");
var config = require('../config');

mongoose.connect(config.db_test_url); // connect to test db

describe("User", function(){
  var currentUser = null;

  beforeEach(function(done){
    //add some test data
    user.create("test@test.com", function(err, u){
      currentUser = u;
      done();
    });
  });

  afterEach(function(done){
    user.model.remove({}, function() {
      done();
    });
  });

  it("creates a new user", function(done){
    user.create("test2@test.com", function(err, u){
      assert.equal(u.email, "test2@test.com");
      done();
    });
  });

  it("creates a new user with UPPERCASE EMAIL", function(done){
    user.create("TEST3@TEST.COM", function(err, u){
      assert.equal(u.email, "test3@test.com"); // should be lowercase
      done();
    });
  });

  it("creates a new user twice", function(done){
    user.create("test4@test.com", function(err, u1){
      assert.equal(u1.email, "test4@test.com");
      user.create("test4@test.com", function(err, u2){
        assert.notEqual(err, null); // should return an error
        assert.equal(u2, null); // user returned should be null
        done();
      });
    });
  });

  it("finds by email", function(done) {
    user.create("test5@test.com", function(err, u) {
      user.findByEmail('test5@test.com', function(err, u2) {
        assert.equal(err, null);
        assert.equal(u2.email, 'test5@test.com');
        done();
      });
    });
  });
});
