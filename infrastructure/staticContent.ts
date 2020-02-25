import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

const stackConfig = new pulumi.Config("static");
const domain = stackConfig.require("domain");
const certArn = stackConfig.require("certificateArn");


// Create an AWS resource (S3 Bucket)
const bucketName = "booking-static-content"
const bucket = new aws.s3.Bucket(bucketName, {
    acl: "public-read",
    corsRules: [
        {allowedMethods: ["GET"], allowedOrigins: ["*"], allowedHeaders: ["*"]}
    ]
});

const hour = 60 * 60;

const cloudfrontDistribution = new aws.cloudfront.Distribution("booking-static", {
    enabled: true,
    aliases: [domain],
    defaultCacheBehavior: {
        targetOriginId: bucket.arn,

        viewerProtocolPolicy: "redirect-to-https",
        allowedMethods: ["GET", "HEAD", "OPTIONS"],
        cachedMethods: ["GET", "HEAD", "OPTIONS"],

        forwardedValues: {
            cookies: { forward: "none" },
            queryString: false,
        },

        minTtl: 0,
        defaultTtl: hour,
        maxTtl: hour,
    },

    priceClass: "PriceClass_100",

    // You can customize error responses. When CloudFront recieves an error from the origin (e.g. S3 or some other
    // web service) it can return a different error code, and return the response for a different resource.
    customErrorResponses: [
        { errorCode: 404, responseCode: 404, responsePagePath: "/404.html" },
    ],

    restrictions: {
        geoRestriction: {
            restrictionType: "none",
        },
    },

    viewerCertificate: {
        acmCertificateArn: certArn,  // Per AWS, ACM certificate must be in the us-east-1 region.
        sslSupportMethod: "sni-only",
    },
    // We only specify one origin for this distribution, the S3 content bucket.
    origins: [
        {
            originId: bucket.arn,
            domainName: bucket.websiteEndpoint,
            customOriginConfig: {
                // Amazon S3 doesn't support HTTPS connections when using an S3 bucket configured as a website endpoint.
                // https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/distribution-web-values-specify.html#DownloadDistValuesOriginProtocolPolicy
                originProtocolPolicy: "http-only",
                httpPort: 80,
                httpsPort: 443,
                originSslProtocols: ["TLSv1.2"],
            },
        },
    ],
});

export const cfDomain = cloudfrontDistribution.domainName
export const staticDomain = domain
export const staticBucket = bucketName