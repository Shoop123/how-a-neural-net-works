import { Construct } from 'constructs';
import { RemovalPolicy, Stack, StackProps, aws_s3 as s3 } from 'aws-cdk-lib';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment'
import { CloudFrontTarget, Route53RecordTarget } from 'aws-cdk-lib/aws-route53-targets'
import * as route53 from 'aws-cdk-lib/aws-route53'
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront'
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins'
import * as certificates from 'aws-cdk-lib/aws-certificatemanager'

const DOMAIN_PREFIX: string = 'www'
const APEX_DOMAIN_NAME: string = 'howaneuralnetworks.com'
const DOMAIN_NAME: string = DOMAIN_PREFIX + '.' + APEX_DOMAIN_NAME
const CERTIFICATE_REGION: string = 'us-east-1'
const INDEX: string = 'index.html'

export class WebsiteInfraStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, "OAI")

    const websiteBucket = this.createBuckets(originAccessIdentity)

    const zone = this.createHostedZone()

    const cloudfrontDistribution = this.createCloudfrontDistribution(zone, websiteBucket, originAccessIdentity)

    this.createARecords(zone, cloudfrontDistribution)
  }

  private createBuckets(originAccessIdentity: cloudfront.OriginAccessIdentity): s3.Bucket {
    const websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
      websiteIndexDocument: INDEX,
      bucketName: DOMAIN_NAME,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    })

    websiteBucket.grantRead(originAccessIdentity)

    new BucketDeployment(this, 'DeployStaticWebsite', {
      sources: [Source.asset('../website')],
      destinationBucket: websiteBucket
   })

    return websiteBucket
  }

  private createHostedZone(): route53.IHostedZone {
    const zone = route53.HostedZone.fromHostedZoneAttributes(this, 'DomainHostedZone', {
      hostedZoneId: 'Z01969333OW6OGWVC243G',
      zoneName: APEX_DOMAIN_NAME
    })

    return zone
  }

  private createCloudfrontDistribution(zone: route53.IHostedZone, websiteBucket: s3.Bucket, originAccessIdentity: cloudfront.OriginAccessIdentity): cloudfront.Distribution {
    const certificate = new certificates.DnsValidatedCertificate(this, 'WebsiteCertificate', {
      domainName: DOMAIN_NAME,
      subjectAlternativeNames: [APEX_DOMAIN_NAME],
      hostedZone: zone,
      region: CERTIFICATE_REGION,
      cleanupRoute53Records: true,
    })

    function generateDistributionProps(bucket: s3.Bucket, domainName: string) {
      return {
        defaultBehavior: {
          origin: new origins.S3Origin(bucket, {
            originAccessIdentity: originAccessIdentity
          }),
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS
        },
        priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
        sslSupportMethod: cloudfront.SSLMethod.SNI,
        domainNames: [
          domainName
        ],
        certificate: certificate,
        defaultRootObject: INDEX,
        enableLogging: true
      }
    }

    const distributionDomainName = new cloudfront.Distribution(this, 'WebsiteDistribution', generateDistributionProps(websiteBucket, DOMAIN_NAME));

    return distributionDomainName
  }

  private createARecords(zone: route53.IHostedZone, distributionDomainName: cloudfront.Distribution){
    new route53.ARecord(this, 'AliasRecord', {
      zone,
      recordName: DOMAIN_PREFIX,
      target: route53.RecordTarget.fromAlias(new CloudFrontTarget(distributionDomainName))
    })
  }
}
