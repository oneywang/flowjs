define(function(require,exports,module){
    var Class = Flowjs.Class;
    var Step = Flowjs.Step;
    var StartFocus = Class({
        extend:Step,
        construct:function(options){
            this.callsuper(options);
        },
        isAbstract:true,
        methods:{
            _describeData:function(){
                return {
                    input:{
                        frames:{
                            type:'object'
                        }
                    },
                    output:{
                        curr:{
                            type:'number'
                        },
                        prev:{type:'number'}
                    }
                };
            }
        }
    });
    
    module.exports = StartFocus;
});
