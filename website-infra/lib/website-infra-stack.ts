import { Construct } from 'constructs';
import { RemovalPolicy, Stack, StackProps, aws_s3 as s3 } from 'aws-cdk-lib';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment'
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront'
import { BlockPublicAccess, Bucket, BucketAccessControl, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import {
  HttpVersion,
  OriginAccessIdentity,
  PriceClass,
  ViewerCertificate,
  ViewerProtocolPolicy } from 'aws-cdk-lib/aws-cloudfront';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as certificateManager from 'aws-cdk-lib/aws-certificatemanager';
import * as targets from 'aws-cdk-lib/aws-route53-targets'

const DOMAIN_PREFIX: string = 'www'
const APEX_DOMAIN_NAME: string = 'howaneuralnetworks.com'
const DOMAIN_NAME: string = DOMAIN_PREFIX + '.' + APEX_DOMAIN_NAME
const CERTIFICATE_REGION: string = 'us-east-1'
const INDEX: string = 'index.html'

export class WebsiteInfraStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const oai = new OriginAccessIdentity(this, "HannwBucketOai")

    const websiteBucket = this.createBucket(oai)

    const zone = this.getHostedZone()

    const certificate = this.createCertificate(zone)

    const webDistribution = this.createWebDistribution(websiteBucket, oai, certificate)

    this.addAliasForDistribution(zone, webDistribution)
  }

  private createBucket(oai: cloudfront.OriginAccessIdentity): Bucket {
    const websiteBucket = new Bucket(this, 'HannwResourceBucket', {
      encryption: BucketEncryption.S3_MANAGED,
      bucketName: DOMAIN_NAME,
      publicReadAccess: false,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      accessControl: BucketAccessControl.PRIVATE,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL
    })

    websiteBucket.grantRead(oai)

    new BucketDeployment(this, 'HannwDeployStatic', {
      sources: [Source.asset('../website')],
      destinationBucket: websiteBucket
   })

    return websiteBucket
  }

  private addAliasForDistribution(zone: route53.IHostedZone,
    webDistribution: cloudfront.CloudFrontWebDistribution) {
    new route53.ARecord(this, 'HannwARecordForApexAvailability', {
      zone: zone,
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(webDistribution)),
      recordName: APEX_DOMAIN_NAME
    })

    new route53.ARecord(this, 'HannwARecordForWwwAvailability', {
      zone: zone,
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(webDistribution)),
      recordName: DOMAIN_NAME
    })
  }

  private getHostedZone(): route53.IHostedZone {
    return route53.HostedZone.fromHostedZoneAttributes(this, 'HannwHostedZone', {
      hostedZoneId: 'Z01969333OW6OGWVC243G',
      zoneName: APEX_DOMAIN_NAME
    })
  }

  private createCertificate(zone: route53.IHostedZone): certificateManager.Certificate {
    return new certificateManager.DnsValidatedCertificate(this, 'HannwCertificate', {
      domainName: APEX_DOMAIN_NAME,
      subjectAlternativeNames: [DOMAIN_NAME],
      hostedZone: zone,
      region: CERTIFICATE_REGION,
      cleanupRoute53Records: true,
    })
  }

  private createWebDistribution(websiteBucket: Bucket,
    oai: OriginAccessIdentity,
    certificate: certificateManager.Certificate
    ): cloudfront.CloudFrontWebDistribution {
    return new cloudfront.CloudFrontWebDistribution(this, 'HannwWebsiteDistribution', {
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
            }
          ]
        }
      ]
    })
  }
}
