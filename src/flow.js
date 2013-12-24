define(function(require,exports,module){
    var Class = require('./util/class');
    var extend = require('./util/deepExtend');
    var isObject = function(arg){
        return Object.prototype.toString.call(arg) == '[object Object]';
    };
    var isArray = Array.isArray || function(arg){
        return Object.prototype.toString.call(arg) == '[object Array]';
    };
    var toArray = function(obj){
        return Array.prototype.slice.call(obj,0);
    };
    var EventPlugin = require('./util/eventPlugin');
    var Flow = Class({
        construct:function(options){
            options = options || {};
            this.__steps = {}; //step instance
            this.__definations = {};
            this.__subs = {};
            this.__context = null;
            this.__contextId = 0;
        },
        plugins:[new EventPlugin()],
        methods:{
            implement:function(stepName,step){
                this.__steps[stepName] = step;
            },
            //销毁流程，释放资源
            destroy:function(){
                var ins = this.__steps;
                for(var stepName in ins){
                    if(ins.hasOwnProperty(stepName)){
                        var step = ins[stepName];
                        var stepData = this.__getStepData(step);
                        try{step.destroy(stepData);}catch(e){}
                    }
                }
            },
            /**
             * 启动一个流程，需要指定context
             * @return {[type]} [description]
             */
            begin:function(data){
                context = {};
                context.data = data || {};
                this.__context = context;
                setTimeout(function(){
                    this.__go(context);
                }.bind(this),0);
            },
            go:function(step,options,context){
                var context = context || this.__context;
                if(!context){
                    throw new Error('No context!');
                }
                var _this = this;
                if(typeof step == 'string'){
                    if(this.__subs[step]){
                        this.__subs[step].apply(this,arguments);
                    }
                    else{
                        var stepName = step;
                        step = this.__steps[step];
                        //未实现的步骤，给一个初始实现，执行该步骤时，直接返回
                        if(!step){
                            step = {
                                type:'step',
                                go:function(data,callback,context){
                                    // console.log(stepName + ' not implement.');
                                    callback(data,context);
                                }
                            }
                        }
                        var stepInfo = {
                            step:step,
                            name:stepName
                        };
                        var def = this.__definations[stepName];
                        if(def){
                            if(def.type === 'condition'){
                                stepInfo.cases = options.cases;
                            }
                            if (def.type === 'event') {
                              stepInfo.events = options.events;
                            }
                        }
                        if(!context.current){
                            context.current = stepInfo;
                            context.__temp = stepInfo;
                        }
                        else{
                            context.__temp.next = stepInfo;
                            context.__temp = stepInfo;
                        }
                    }
                }
            },
            addStep:function(stepName,stepDefination){
                this.__definations[stepName] = stepDefination;
            },
            __stepCallback:function(data,context){
                extend(context.data,this.__getStepData(context.current,data));
                if(context.current.next){
                    context.current = context.current.next;
                    this.__go(context);
                }
                else{
                    this.fire({type:'end'});
                }
            },
            __conditionCallback:function(data,condition,context){
                extend(context.data,this.__getStepData(context.current,data));
                var stepInfo = context.current;
                var cases = stepInfo.cases;
                if(cases[condition]){
                    cases[condition].apply(this,[this.__getCurrentStepData(context)]);
                }
                //不存在的流程分支，直接结束流程
                else{
                    this.fire({type:'end'});
                }
            },
            __eventCallback:function(data,event,context){
                extend(context.data,this.__getStepData(context.current,data));
                var stepInfo = context.current;
                var events = stepInfo.events;
                if(events[event]){
                    events[event].apply(this,[this.__getCurrentStepData(context)]);
                }
            },
            __getCurrentStepData:function(context){
                return this.__getStepData(context.current,context.data);
            },
            __getStepData:function(stepInfo,data){
                var def = this.__definations[stepInfo.name] || {};
                return this.__getData(def.output,data);
            },
            __getData:function(struct,data){
                struct = struct || {};
                var result = {};
                for(var key in struct){
                    if(struct[key].empty === false && !data.hasOwnProperty(key)){
                        this.fire({type:'error',data:{message:'Key [' + key + '] is not allow empty'}});
                        return result;
                    }
                    var value = data[key];
                    var valueIsArray;
                    if((valueIsArray = isArray(value)) || isObject(value)){
                        result[key] = extend(valueIsArray ? [] : {},value);
                    }
                    else{
                        result[key] = value;
                    }
                }
                return result;
            },
            __go:function(context){
                var stepInfo = context.current;
                var def = this.__definations[stepInfo.name] || {};
                var inputData = this.__getData(def.input,context.data);
                if(def && def.type === 'condition'){
                    stepInfo.step.go(inputData,function(outputData,condition){
                        this.__conditionCallback(outputData,condition,context);
                    }.bind(this));
                }
                else if(def && def.type === 'event'){
                    stepInfo.step.go(
                        inputData,
                        function(outputData){
                            this.__stepCallback(outputData || inputData,context);
                        }.bind(this),
                        function(outputData,event){
                            this.__eventCallback(outputData || inputData,event,context);
                        }.bind(this)
                    );
                }
                else{
                    stepInfo.step.go(inputData,function(outputData){
                        this.__stepCallback(outputData || inputData,context);
                    }.bind(this));
                }
            },
        }
    });
    
    module.exports = Flow;
});
