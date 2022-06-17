import { Construct } from 'constructs';
import { RemovalPolicy, Stack, StackProps, aws_s3 as s3 } from 'aws-cdk-lib';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment'
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront'
import { BlockPublicAccess, Bucket, BucketAccessControl, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import { HttpVersion, OriginAccessIdentity, PriceClass, ViewerCertificate, ViewerProtocolPolicy } from 'aws-cdk-lib/aws-cloudfront';
import { HostedZone, IHostedZone } from 'aws-cdk-lib/aws-route53';
import { Certificate, DnsValidatedCertificate } from 'aws-cdk-lib/aws-certificatemanager';

const DOMAIN_PREFIX: string = 'www'
const APEX_DOMAIN_NAME: string = 'howaneuralnetworks.com'
const DOMAIN_NAME: string = DOMAIN_PREFIX + '.' + APEX_DOMAIN_NAME
const CERTIFICATE_REGION: string = 'us-east-1'
const INDEX: string = 'index.html'

export class WebsiteInfraStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const oai = new OriginAccessIdentity(this, "OAI")

    const websiteBucket = this.createBucket(oai)

    const zone = this.getHostedZone()

    const certificate = this.createCertificate(zone)

    this.createWebDistribution(websiteBucket, oai, certificate)
  }

  private createBucket(oai: cloudfront.OriginAccessIdentity): Bucket {
    const websiteBucket = new Bucket(this, 'WebsiteBucket', {
      encryption: BucketEncryption.S3_MANAGED,
      bucketName: DOMAIN_NAME,
      publicReadAccess: false,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      accessControl: BucketAccessControl.PRIVATE,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL
    })

    websiteBucket.grantRead(oai)

    new BucketDeployment(this, 'DeployStaticWebsite', {
      sources: [Source.asset('../website')],
      destinationBucket: websiteBucket
   })

    return websiteBucket
  }

  private getHostedZone(): IHostedZone {
    return HostedZone.fromHostedZoneAttributes(this, 'ApexDomainHostedZone', {
      hostedZoneId: 'Z01969333OW6OGWVC243G',
      zoneName: APEX_DOMAIN_NAME
    })
  }

  private createCertificate(zone: IHostedZone): Certificate {
    return new DnsValidatedCertificate(this, 'WebsiteCertificate', {
      domainName: APEX_DOMAIN_NAME,
      subjectAlternativeNames: [DOMAIN_NAME],
      hostedZone: zone,
      region: CERTIFICATE_REGION,
      cleanupRoute53Records: true,
    })
  }

  private createWebDistribution(websiteBucket: Bucket, oai: OriginAccessIdentity, certificate: Certificate) {
    new cloudfront.CloudFrontWebDistribution(this, 'WebsiteDistribution', {
      viewerCertificate: ViewerCertificate.fromAcmCertificate(certificate, {
        aliases: [DOMAIN_NAME, APEX_DOMAIN_NAME],
      }),
      defaultRootObject: INDEX,
      viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      httpVersion: HttpVersion.HTTP2,
      priceClass: PriceClass.PRICE_CLASS_100,
      originConfigs: [
        {
          s3OriginSource: {
            originAccessIdentity: oai,
            s3BucketSource: websiteBucket
          },
          behaviors: [
            {
              compress: true,
              isDefaultBehavior: true,
            },
          ],
        },
      ],
      // Allows React to handle all errors internally
      // errorConfigurations: [
      //   {
      //     errorCachingMinTtl: 300, // in seconds
      //     errorCode: 403,
      //     responseCode: 200,
      //     responsePagePath: `/${ROOT_INDEX_FILE}`,
      //   },
      //   {
      //     errorCachingMinTtl: 300, // in seconds
      //     errorCode: 404,
      //     responseCode: 200,
      //     responsePagePath: `/${ROOT_INDEX_FILE}`,
      //   },
      // ]
    })
  }
}
