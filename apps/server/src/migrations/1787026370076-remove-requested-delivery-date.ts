import {MigrationInterface, QueryRunner} from "typeorm";

export class RemoveRequestedDeliveryDate1787026370076 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "order" DROP COLUMN "customFieldsRequesteddeliverydate"`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "order" ADD "customFieldsRequesteddeliverydate" TIMESTAMP`, undefined);
   }

}
