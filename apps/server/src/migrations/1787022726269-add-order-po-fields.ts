import {MigrationInterface, QueryRunner} from "typeorm";

export class AddOrderPoFields1787022726269 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "order" ADD "customFieldsPurchaseordernumber" character varying(255)`, undefined);
        await queryRunner.query(`ALTER TABLE "order" ADD "customFieldsRequesteddeliverydate" TIMESTAMP(6)`, undefined);
        await queryRunner.query(`ALTER TABLE "order" ADD "customFieldsCustomernotes" text`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "order" DROP COLUMN "customFieldsCustomernotes"`, undefined);
        await queryRunner.query(`ALTER TABLE "order" DROP COLUMN "customFieldsRequesteddeliverydate"`, undefined);
        await queryRunner.query(`ALTER TABLE "order" DROP COLUMN "customFieldsPurchaseordernumber"`, undefined);
   }

}
