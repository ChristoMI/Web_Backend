import * as AWS from 'aws-sdk'

AWS.config.update({
    region: "us-west-2",
    dynamodb: {
        endpoint: "http://localhost:8000"
    },
    accessKeyId: 'empty',
    secretAccessKey: 'empty'
});