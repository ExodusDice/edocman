package com.edocman.controller;

import com.edocman.model.LegalServiceOrder;
import com.edocman.model.User;
import com.edocman.model.ServicePrice;
import com.edocman.repository.LegalServiceOrderRepository;
import com.edocman.repository.UserRepository;
import com.edocman.repository.ServicePriceRepository;
import com.edocman.security.UserContext;
import com.edocman.service.DocumentGeneratorService;
import com.edocman.service.SupabaseStorageService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import jakarta.annotation.PostConstruct;

@RestController
@RequestMapping("/api/orders")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class OrderController {

    @Autowired
    private ServicePriceRepository servicePriceRepository;

    @PostConstruct
    public void initPrices() {
        seedService(LegalServiceOrder.ServiceType.COMPANY_NAME_RESERVATION, new BigDecimal("490.00"), "จองชื่อบริษัท (DBD)", "จดทะเบียนและเอกสารกฎหมาย", "บริการจองชื่อบริษัทจำกัดผ่านระบบกรมพัฒนาธุรกิจการค้า (DBD) รวดเร็ว ถูกต้องตามหลักเกณฑ์", 2);
        seedService(LegalServiceOrder.ServiceType.COMPANY_OPENING, new BigDecimal("4900.00"), "จัดตั้งบริษัทจำกัด (บอจ.1)", "จดทะเบียนและเอกสารกฎหมาย", "บริการจดทะเบียนจัดตั้งบริษัทจำกัด (บอจ.1) เตรียมเอกสารจดทะเบียนครบวงจรพร้อมยื่นกรมพัฒนาธุรกิจการค้า", 5);
        seedService(LegalServiceOrder.ServiceType.COMPANY_CLOSING, new BigDecimal("9900.00"), "เลิกและชำระบัญชีบริษัท", "จดทะเบียนและเอกสารกฎหมาย", "บริการจดทะเบียนเลิกบริษัทและชำระบัญชี จัดการงานเอกสารและผู้สอบบัญชีครบวงจรเพื่อความถูกต้องทางกฎหมาย", 30);
        seedService(LegalServiceOrder.ServiceType.DBD_E_FILING, new BigDecimal("1900.00"), "นำส่งงบ e-Filing", "ภาษีและสรรพากร", "บริการนำส่งงบการเงินผ่านระบบ DBD e-Filing ของกรมพัฒนาธุรกิจการค้า ประจำปีอย่างถูกต้องตามกำหนดเวลา", 3);
        seedService(LegalServiceOrder.ServiceType.CAR_PRB_INSURANCE, new BigDecimal("645.00"), "พ.ร.บ. รถยนต์ ออกกรมธรรม์ทันที (Instant Policy Issuance)", "ประกันภัย", "กรอกข้อมูลรถยนต์และผู้ครอบครอง ออกกรมธรรม์ พ.ร.บ. ภาคบังคับ (e-Policy PDF) ทันทีอัตโนมัติ คุ้มครองทันใจ", 1);
        seedService(LegalServiceOrder.ServiceType.HOUSE_REGISTRATION_UPDATE, new BigDecimal("990.00"), "แก้ไขข้อมูลทะเบียนบ้าน", "จดทะเบียนและเอกสารกฎหมาย", "บริการยื่นคำร้องขอแก้ไขข้อมูลทะเบียนบ้าน ย้ายเข้า-ย้ายออก หรือขอสมุดทะเบียนบ้านเล่มใหม่", 3);
        seedService(LegalServiceOrder.ServiceType.PDPA_BADGE_SETUP, new BigDecimal("890.00"), "ตราสัญลักษณ์ PDPA Badge", "จดทะเบียนและเอกสารกฎหมาย", "บริการประเมินและตั้งค่าตราสัญลักษณ์ PDPA Consent Badge สำหรับแสดงบนเว็บไซต์ เพื่อความสอดคล้องกับ พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล", 2);
        seedService(LegalServiceOrder.ServiceType.COMPANY_NAME_CHANGE, new BigDecimal("1900.00"), "จดทะเบียนเปลี่ยนชื่อบริษัท", "จดทะเบียนและเอกสารกฎหมาย", "บริการจดทะเบียนเปลี่ยนชื่อบริษัทจำกัด ยื่นขอแก้ไขตราประทับและหนังสือบริคณห์สนธิที่กรมพัฒนาธุรกิจการค้า", 5);
        seedService(LegalServiceOrder.ServiceType.MEMORANDUM_AMENDMENT, new BigDecimal("2900.00"), "แก้ไขหนังสือบริคณห์สนธิ", "จดทะเบียนและเอกสารกฎหมาย", "บริการยื่นคำขอแก้ไขเพิ่มเติมหนังสือบริคณห์สนธิ (มติพิเศษ) ต่อกรมพัฒนาธุรกิจการค้า", 5);
        seedService(LegalServiceOrder.ServiceType.FINANCIAL_STATEMENT_PREP, new BigDecimal("4500.00"), "จัดทำงบการเงินประจำปี", "ภาษีและสรรพากร", "บริการจัดทำงบแสดงฐานะการเงิน งบกำไรขาดทุน และรายละเอียดประกอบงบการเงินสำหรับนิติบุคคล", 10);
        seedService(LegalServiceOrder.ServiceType.COMPANY_DIRECTOR_CHANGE, new BigDecimal("1900.00"), "เปลี่ยนตัวกรรมการ (เจ้าของ)", "จดทะเบียนและเอกสารกฎหมาย", "บริการจดทะเบียนเปลี่ยนตัวกรรมการบริษัท เข้าหรือออก ยื่นคำขอพร้อมรายงานผู้ถือหุ้นและกรรมการใหม่", 3);
        seedService(LegalServiceOrder.ServiceType.SHAREHOLDER_UPDATE, new BigDecimal("1200.00"), "แก้ไขรายชื่อผู้ถือหุ้น (บอจ.5)", "จดทะเบียนและเอกสารกฎหมาย", "บริการยื่นบัญชีรายชื่อผู้ถือหุ้น (บอจ.5) ฉบับล่าสุด หรือกรณีมีการสลับ/โอนหุ้น ระหว่างปี", 2);
        seedService(LegalServiceOrder.ServiceType.FINANCIAL_STATEMENT_AUDIT, new BigDecimal("7500.00"), "ตรวจสอบงบการเงิน (CPA)", "ภาษีและสรรพากร", "บริการตรวจสอบบัญชีโดยผู้สอบบัญชีรับอนุญาต (CPA) แสดงความเห็นต่องบการเงินตามมาตรฐานการรายงานทางการเงิน", 15);
        seedService(LegalServiceOrder.ServiceType.FINANCIAL_STATEMENT_APPROVAL, new BigDecimal("1500.00"), "อนุมัติงบการเงิน (AGM)", "ภาษีและสรรพากร", "บริการจัดการส่งรายงานการประชุมสามัญผู้ถือหุ้นประจำปี (AGM) เพื่ออนุมัติงบการเงิน", 5);
        seedService(LegalServiceOrder.ServiceType.SMART_ETAX, new BigDecimal("2500.00"), "ระบบ Smart e-Tax Invoice", "ภาษีและสรรพากร", "ระบบยื่นขอใบกำกับภาษีอิเล็กทรอนิกส์และใบรับอิเล็กทรอนิกส์ (e-Tax Invoice & e-Receipt) กับกรมสรรพากร", 7);

        // 1. Motor Insurance & Voluntary
        seedService(LegalServiceOrder.ServiceType.INSURANCE_POLICY_ENDORSEMENT, new BigDecimal("350.00"), "แจ้งแก้ไข/สลักหลังกรมธรรม์ (Policy Corrections / Endorsement)", "ประกันภัย", "บริการแจ้งแก้ไขข้อมูลผู้เอาประกันภัย เปลี่ยนชื่อผู้ครอบครอง ปรับปรุงเลขทะเบียนรถ หรือขยายระยะเวลาคุ้มครองแบบออนไลน์", 1);
        seedService(LegalServiceOrder.ServiceType.INSURANCE_VOLUNTARY_MOTOR, new BigDecimal("7500.00"), "ประกันภัยรถยนต์ภาคสมัครใจ ชั้น 1, 2+, 3, 3+ (Voluntary Motor Insurance)", "ประกันภัย", "เปรียบเทียบเบี้ยประกันจากบริษัทชั้นนำ เลือกแผนความคุ้มครอง ชำระเงินออนไลน์ และจัดส่งกรมธรรม์ดิจิทัล (e-Policy)", 2);

        // 2. DLT & Vehicle Paperwork
        seedService(LegalServiceOrder.ServiceType.VEHICLE_TAX_RENEWAL, new BigDecimal("1200.00"), "ต่อภาษีประจำปี/ป้ายวงกลม (Annual Tax Sticker Renewal)", "ยานพาหนะและขนส่ง", "ต่อภาษีรถยนต์ (อายุไม่เกิน 7 ปี) หรือ มอเตอร์ไซค์ (อายุไม่เกิน 5 ปี) โดยไม่ต้องตรวจสภาพ ยื่นอิเล็กทรอนิกส์พร้อมจัดส่งป้ายภาษีถึงบ้าน", 2);
        seedService(LegalServiceOrder.ServiceType.VEHICLE_OVERDUE_TAX_FINES, new BigDecimal("850.00"), "ชำระภาษีย้อนหลังและค่าปรับจราจร (Overdue Tax & Fine Settlement)", "ยานพาหนะและขนส่ง", "บริการตรวจสอบและเคลียร์ยอดภาษีค้างชำระ พร้อมชำระใบสั่ง/ค่าปรับจราจรออนไลน์ก่อนดำเนินการต่อภาษีประจำปี", 2);
        seedService(LegalServiceOrder.ServiceType.VEHICLE_POWER_OF_ATTORNEY, new BigDecimal("290.00"), "หนังสือมอบอำนาจงานขนส่ง DLT (Power of Attorney Generator)", "ยานพาหนะและขนส่ง", "ระบบกรอกและสร้างแบบฟอร์มหนังสือมอบอำนาจสำหรับดำเนินงานกรมการขนส่งทางบกอัตโนมัติ พร้อมพิมพ์หรือลงนามอิเล็กทรอนิกส์", 1);
        seedService(LegalServiceOrder.ServiceType.VEHICLE_PLATE_REPLACEMENT, new BigDecimal("950.00"), "ขอแผ่นป้ายทะเบียนใหม่ (License Plate Replacement)", "ยานพาหนะและขนส่ง", "บริการยื่นคำร้องขอแผ่นป้ายทะเบียนใหม่ทดแทนกรณีป้ายสูญหาย ลบเลือน หรือชำรุด โดยไม่ต้องเดินทางไปขนส่ง พร้อมจัดส่งแผ่นป้ายถึงบ้าน", 3);
        seedService(LegalServiceOrder.ServiceType.VEHICLE_BOOK_REPLACEMENT, new BigDecimal("1100.00"), "ขอสมุดคู่มือจดทะเบียนใหม่ (Registration Book Replacement)", "ยานพาหนะและขนส่ง", "บริการยื่นคำร้องขอสมุดคู่มือจดทะเบียนรถ (เล่มเขียว/เล่มฟ้า) เล่มใหม่ กรณีเล่มสูญหาย ชำรุด หรือรายการเต็ม ผ่านหนังสือมอบอำนาจ", 3);
        seedService(LegalServiceOrder.ServiceType.VEHICLE_SPEC_ALTERATION, new BigDecimal("1250.00"), "แจ้งเปลี่ยนสี/แก้ไขดัดแปลงสภาพรถ (Vehicle Spec Alteration Updates)", "ยานพาหนะและขนส่ง", "บริการยื่นเอกสารแจ้งเปลี่ยนสีรถ เปลี่ยนเครื่องยนต์ ดัดแปลงระบบเชื้อเพลิง หรือโครงสร้างตัวถังรถยนต์ต่อกรมการขนส่งทางบก", 3);
        seedService(LegalServiceOrder.ServiceType.VEHICLE_PROVINCE_TRANSFER, new BigDecimal("1800.00"), "ย้ายทะเบียนรถข้ามจังหวัด (Out-of-Province Vehicle Re-registration)", "ยานพาหนะและขนส่ง", "บริการแจ้งย้ายรถเข้า-ออกต่างจังหวัด โอนย้ายปลายทาง และขอรับป้ายทะเบียนจังหวัดใหม่แบบเบ็ดเสร็จครบวงจร", 5);

        // 3. Visas & Immigration Compliance
        seedService(LegalServiceOrder.ServiceType.VISA_90DAY_REPORTING, new BigDecimal("950.00"), "รายงานตัว 90 วันออนไลน์ ตม.47 (90-Day Online Reporting TM.47)", "วีซ่าและคนเข้าเมือง", "บริการยื่นคำขอรายงานตัวคนต่างด้าวพักอาศัยเกิน 90 วัน (ตม.47) ผ่านระบบออนไลน์ รวดเร็ว ตรวจสอบสถานะและรับใบรับแจ้ง", 2);
        seedService(LegalServiceOrder.ServiceType.VISA_TM30_NOTIFICATION, new BigDecimal("650.00"), "แจ้งที่พักอาศัยคนต่างด้าว ตม.30 (TM.30 Address Notification)", "วีซ่าและคนเข้าเมือง", "บริการแจ้งที่พักอาศัยของชาวต่างชาติตามแบบ ตม.30 สำหรับเจ้าของที่พักอาศัย ผู้เช่า หรือผู้จัดการโรงแรม ผ่านระบบดิจิทัล", 1);
        seedService(LegalServiceOrder.ServiceType.VISA_OUTBOUND_APPLICATION_PACK, new BigDecimal("1850.00"), "ชุดเอกสารขอ eVisa และจองคิวสถานทูต (Outbound eVisa / Embassy Packs)", "วีซ่าและคนเข้าเมือง", "บริการจัดเตรียมชุดเอกสาร กรอกแบบฟอร์มขอวีซ่าต่างประเทศ แปลเอกสาร ตรวจสอบ Checklist และจองคิวสัมภาษณ์สถานทูตสำหรับคนไทย", 3);

        // 4. Social Security & Labor Department
        seedService(LegalServiceOrder.ServiceType.SSO_ARTICLE_39_40_ENROLLMENT, new BigDecimal("490.00"), "สมัครประกันสังคม มาตรา 39 / 40 (Article 39 / 40 Self-Enrollment)", "ประกันสังคมและแรงงาน", "บริการยื่นสมัครประกันสังคมภาคสมัครใจสำหรับฟรีแลนซ์และผู้ประกันตนอิสระ (ม.39 / ม.40) ผ่านระบบออนไลน์", 2);
        seedService(LegalServiceOrder.ServiceType.SSO_HOSPITAL_CHANGE, new BigDecimal("350.00"), "ยื่นเปลี่ยนสถานพยาบาลประกันสังคม (SSO Hospital Change Requests)", "ประกันสังคมและแรงงาน", "บริการยื่นคำขอเปลี่ยนโรงพยาบาล/สถานพยาบาลตามสิทธิประกันสังคมประจำปีอย่างรวดเร็วและถูกต้อง", 2);
        seedService(LegalServiceOrder.ServiceType.SSO_COMPENSATION_CLAIMS, new BigDecimal("890.00"), "ยื่นเบิกสิทธิประโยชน์ คลอดบุตร/สงเคราะห์บุตร/ว่างงาน (SSO Compensation Claims)", "ประกันสังคมและแรงงาน", "บริการรวบรวมเอกสาร กรอกแบบฟอร์ม สปส. และยื่นเรื่องขอรับเงินชดเชยสิทธิประโยชน์ว่างงาน คลอดบุตร หรือสงเคราะห์บุตร", 3);

        // 5. Revenue Department & Tax Filings
        seedService(LegalServiceOrder.ServiceType.TAX_PERSONAL_INCOME_EFILING, new BigDecimal("1200.00"), "ยื่นภาษีเงินได้บุคคลธรรมดา ภ.ง.ด.90/91/94 (Personal Income Tax e-Filing)", "ภาษีและสรรพากร", "บริการรวบรวมรายได้ คำนวณสิทธิลดหย่อนภาษี และยื่นแบบแสดงรายการภาษีเงินได้บุคคลธรรมดาทางอิเล็กทรอนิกส์", 3);
        seedService(LegalServiceOrder.ServiceType.TAX_VAT_REGISTRATION_SUBMISSION, new BigDecimal("2500.00"), "จดทะเบียนภาษีมูลค่าเพิ่ม (ภ.พ.20) และยื่น ภ.พ.30 (VAT Registration & Submissions)", "ภาษีและสรรพากร", "บริการจัดเตรียมเอกสารยื่นขอจดทะเบียน ภ.พ.20 และยื่นแบบแสดงรายการภาษีมูลค่าเพิ่ม ภ.พ.30 รายเดือนอย่างถูกต้อง", 3);
        seedService(LegalServiceOrder.ServiceType.TAX_WITHHOLDING_CERT_50TAWI, new BigDecimal("450.00"), "ออกหนังสือรับรองภาษีหัก ณ ที่จ่าย 50 ทวิ (Withholding Tax Cert Generation)", "ภาษีและสรรพากร", "ระบบสร้าง ออก และลงลายมือชื่ออิเล็กทรอนิกส์ในหนังสือรับรองการหักภาษี ณ ที่จ่าย (ใบ 50 ทวิ) พร้อมดาวน์โหลดไฟล์ PDF", 1);

        // 6. Commercial & Municipal Licensing
        seedService(LegalServiceOrder.ServiceType.LICENSE_DIRECT_SALES_OCPB, new BigDecimal("4900.00"), "ขอใบอนุญาตตลาดแบบตรง/ขายตรง สคบ. (Direct Marketing Permits)", "ใบอนุญาตและการค้า", "บริการจัดเตรียมเอกสารและยื่นขอจดทะเบียนการประกอบธุรกิจตลาดแบบตรง/การขายตรงต่อสำนักงานคณะกรรมการคุ้มครองผู้บริโภค (สคบ.)", 7);
        seedService(LegalServiceOrder.ServiceType.LICENSE_MUSIC_COPYRIGHT, new BigDecimal("2900.00"), "ขอใบอนุญาตเผยแพร่ลิขสิทธิ์เพลง (Music Copyright Performance License)", "ใบอนุญาตและการค้า", "บริการยื่นขอใบอนุญาตเผยแพร่และเปิดเพลงถูกต้องตามลิขสิทธิ์สำหรับร้านค้า คาเฟ่ ร้านอาหาร และสถานประกอบการ", 3);
        seedService(LegalServiceOrder.ServiceType.LICENSE_SIGNBOARD_TAX, new BigDecimal("1500.00"), "คำนวณและยื่นชำระภาษีป้าย (Signboard Tax Assessment & Filing)", "ใบอนุญาตและการค้า", "บริการคำนวณขนาดป้าย จัดเตรียมแบบฟอร์ม ภ.ป.1 และดำเนินการยื่นชำระภาษีป้ายต่อเทศบาลหรือสำนักงานเขต", 3);

        // 7. Corporate, Legal Agreements & Notarization
        seedService(LegalServiceOrder.ServiceType.DBD_NAME_RESERVATION_ECERT, new BigDecimal("590.00"), "จองชื่อบริษัทและขอหนังสือรับรอง e-Certificate (DBD Name & e-Cert)", "จดทะเบียนและเอกสารกฎหมาย", "บริการจองชื่อนิติบุคคล และขอคัดหนังสือรับรองบริษัทอิเล็กทรอนิกส์ (e-Certificate) จาก DBD แบบดิจิทัล 100% จัดส่ง PDF ทันที", 1);
        seedService(LegalServiceOrder.ServiceType.LEGAL_FORM_GENERATION, new BigDecimal("790.00"), "สร้างเอกสารสัญญาทางกฎหมายออนไลน์ (Online Legal Form Generation)", "จดทะเบียนและเอกสารกฎหมาย", "ระบบร่างสัญญาซื้อขาย สัญญาเช่า หนังสือรับสภาพหนี้ และสัญญาทางธุรกิจอัตโนมัติ พร้อมระบบลงนามอิเล็กทรอนิกส์ (e-Signature)", 1);
        seedService(LegalServiceOrder.ServiceType.LEGAL_POA_DISPATCH, new BigDecimal("690.00"), "หนังสือมอบอำนาจเฉพาะทางและจัดส่งฉบับจริง (POA Generator & Dispatch)", "จดทะเบียนและเอกสารกฎหมาย", "ระบบสร้างหนังสือมอบอำนาจเฉพาะทาง (ที่ดิน ยานพาหนะ หรือนิติบุคคล) พิมพ์และจัดส่งฉบับจริงพร้อมปิดอากรแสตมป์ถูกต้อง", 1);
        seedService(LegalServiceOrder.ServiceType.LEGAL_REMOTE_ESIGN_CONTRACT, new BigDecimal("1450.00"), "ร่างสัญญา NDA / สัญญาจ้างงาน / สัญญาเช่า พร้อม e-Sign (Remote e-Sign Contract)", "จดทะเบียนและเอกสารกฎหมาย", "บริการร่างสัญญามาตรฐานสากล (NDA, สัญญาจ้างงาน, สัญญาเช่าเชิงพาณิชย์) พร้อมระบบส่งลิงก์ลงนามอิเล็กทรอนิกส์สองฝ่าย", 2);
        seedService(LegalServiceOrder.ServiceType.LEGAL_NOTARY_TRANSLATION_HUB, new BigDecimal("2900.00"), "โนตารีพับลิค แปลเอกสารรับรองและส่งคืนไปรษณีย์ (Notary Public & Translation Hub)", "จดทะเบียนและเอกสารกฎหมาย", "บริการแปลเอกสารทางกฎหมาย รับรองเอกสารโดยทนายความ Notary Public พร้อมจัดส่งเอกสารรับรองฉบับจริงทางไปรษณีย์ด่วน", 3);
    }

    private void seedService(LegalServiceOrder.ServiceType type, BigDecimal price, String nameTh, String category, String contentTh, int slaDays) {
        if (!servicePriceRepository.existsById(type)) {
            servicePriceRepository.save(new ServicePrice(type, price, nameTh, category, contentTh, slaDays));
        }
    }

    @GetMapping("/services")
    public ResponseEntity<List<ServicePrice>> getPublicServices() {
        return ResponseEntity.ok(servicePriceRepository.findAll());
    }

    @Autowired
    private LegalServiceOrderRepository orderRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SupabaseStorageService supabaseStorageService;

    @Autowired
    private DocumentGeneratorService documentGeneratorService;

    @Autowired
    private com.edocman.service.ResendEmailService resendEmailService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @PostMapping
    public ResponseEntity<?> createOrder(@RequestBody LegalServiceOrder orderRequest) {
        String clerkUserId = UserContext.getCurrentUser();
        if (clerkUserId == null) {
            return ResponseEntity.status(401).body("{\"error\": \"Unauthorized\"}");
        }

        BigDecimal servicePrice = getStandardPrice(orderRequest.getServiceType());
        
        LegalServiceOrder order = LegalServiceOrder.builder()
                .clerkUserId(clerkUserId)
                .serviceType(orderRequest.getServiceType())
                .status(LegalServiceOrder.OrderStatus.PENDING_PAYMENT)
                .price(servicePrice)
                .currency("THB")
                .serviceData(orderRequest.getServiceData())
                .documentUrl(orderRequest.getDocumentUrl())
                .build();

        LegalServiceOrder savedOrder = orderRepository.save(order);

        // Send Order Creation confirmation email
        Optional<User> userOpt = userRepository.findByClerkUserId(clerkUserId);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            String subject = "eDocman: ใบแจ้งงานสำหรับธุรกรรม #" + savedOrder.getId();
            String serviceName = translateServiceType(savedOrder.getServiceType());
            String bodyHtml = "<h3>ใบแจ้งยืนยันธุรกรรมคำขอ eDocman</h3>" +
                    "<p>เรียนคุณ " + user.getFullName() + ",</p>" +
                    "<p>ระบบได้รับคำขอทำรายการแบบฟอร์มออนไลน์สำเร็จแล้ว รายละเอียดธุรกรรมมีดังนี้:</p>" +
                    "<ul>" +
                    "<li><strong>เลขที่อ้างอิง:</strong> #" + savedOrder.getId() + "</li>" +
                    "<li><strong>ประเภทบริการ:</strong> " + serviceName + "</li>" +
                    "<li><strong>ยอดชำระ:</strong> " + savedOrder.getPrice() + " บาท</li>" +
                    "<li><strong>สถานะคำขอ:</strong> รอการชำระเงิน (Pending Payment)</li>" +
                    "</ul>" +
                    "<p>คุณสามารถดำเนินการเข้าสู่หน้าแดชบอร์ดเพื่อชำระเงิน หรือจัดการข้อมูลเพิ่มเติมได้ตลอดเวลา</p>" +
                    "<br><p>ขอบคุณที่ใช้บริการ,<br>ทีมงาน eDocman</p>";
            try {
                resendEmailService.sendEmail(user.getEmail(), subject, bodyHtml);
            } catch (Exception e) {
                System.err.println("Failed to send order email via Resend: " + e.getMessage());
            }
        }

        return ResponseEntity.ok(savedOrder);
    }

    private String translateServiceType(LegalServiceOrder.ServiceType type) {
        if (type == null) return "บริการทั่วไป";
        switch (type) {
            case CAR_PRB_INSURANCE: return "พ.ร.บ. รถยนต์ ออกกรมธรรม์ทันที";
            case COMPANY_CLOSING: return "เลิกและชำระบัญชีบริษัท";
            case COMPANY_DIRECTOR_CHANGE: return "เปลี่ยนตัวกรรมการ (เจ้าของ)";
            case COMPANY_NAME_CHANGE: return "จดทะเบียนเปลี่ยนชื่อบริษัท";
            case COMPANY_NAME_RESERVATION: return "จองชื่อบริษัท (DBD)";
            case COMPANY_OPENING: return "จัดตั้งบริษัทจำกัด (บอจ.1)";
            case DBD_E_FILING: return "นำส่งงบ e-Filing";
            case FINANCIAL_STATEMENT_APPROVAL: return "อนุมัติงบการเงิน (AGM)";
            case FINANCIAL_STATEMENT_AUDIT: return "ตรวจสอบงบการเงิน (CPA)";
            case FINANCIAL_STATEMENT_PREP: return "จัดทำงบการเงินประจำปี";
            case HOUSE_REGISTRATION_UPDATE: return "แก้ไขข้อมูลทะเบียนบ้าน";
            case MEMORANDUM_AMENDMENT: return "แก้ไขหนังสือบริคณห์สนธิ";
            case PDPA_BADGE_SETUP: return "ตราสัญลักษณ์ PDPA Badge";
            case SHAREHOLDER_UPDATE: return "แก้ไขรายชื่อผู้ถือหุ้น (บอจ.5)";
            case SMART_ETAX: return "ระบบ Smart e-Tax Invoice";
            case INSURANCE_POLICY_ENDORSEMENT: return "แจ้งแก้ไข/สลักหลังกรมธรรม์";
            case INSURANCE_VOLUNTARY_MOTOR: return "ประกันภัยรถยนต์ภาคสมัครใจ ชั้น 1, 2+, 3, 3+";
            case VEHICLE_TAX_RENEWAL: return "ต่อภาษีประจำปี/ป้ายวงกลม";
            case VEHICLE_OVERDUE_TAX_FINES: return "ชำระภาษีย้อนหลังและค่าปรับจราจร";
            case VEHICLE_POWER_OF_ATTORNEY: return "หนังสือมอบอำนาจงานขนส่ง DLT";
            case VEHICLE_PLATE_REPLACEMENT: return "ขอแผ่นป้ายทะเบียนใหม่";
            case VEHICLE_BOOK_REPLACEMENT: return "ขอสมุดคู่มือจดทะเบียนใหม่";
            case VEHICLE_SPEC_ALTERATION: return "แจ้งเปลี่ยนสี/แก้ไขดัดแปลงสภาพรถ";
            case VEHICLE_PROVINCE_TRANSFER: return "ย้ายทะเบียนรถข้ามจังหวัด";
            case VISA_90DAY_REPORTING: return "รายงานตัว 90 วันออนไลน์ ตม.47";
            case VISA_TM30_NOTIFICATION: return "แจ้งที่พักอาศัยคนต่างด้าว ตม.30";
            case VISA_OUTBOUND_APPLICATION_PACK: return "ชุดเอกสารขอ eVisa และจองคิวสถานทูต";
            case SSO_ARTICLE_39_40_ENROLLMENT: return "สมัครประกันสังคม มาตรา 39 / 40";
            case SSO_HOSPITAL_CHANGE: return "ยื่นเปลี่ยนสถานพยาบาลประกันสังคม";
            case SSO_COMPENSATION_CLAIMS: return "ยื่นเบิกสิทธิประโยชน์ คลอดบุตร/สงเคราะห์บุตร/ว่างงาน";
            case TAX_PERSONAL_INCOME_EFILING: return "ยื่นภาษีเงินได้บุคคลธรรมดา ภ.ง.ด.90/91/94";
            case TAX_VAT_REGISTRATION_SUBMISSION: return "จดทะเบียนภาษีมูลค่าเพิ่ม (ภ.พ.20) และยื่น ภ.พ.30";
            case TAX_WITHHOLDING_CERT_50TAWI: return "ออกหนังสือรับรองภาษีหัก ณ ที่จ่าย 50 ทวิ";
            case LICENSE_DIRECT_SALES_OCPB: return "ขอใบอนุญาตตลาดแบบตรง/ขายตรง สคบ.";
            case LICENSE_MUSIC_COPYRIGHT: return "ขอใบอนุญาตเผยแพร่ลิขสิทธิ์เพลง";
            case LICENSE_SIGNBOARD_TAX: return "คำนวณและยื่นชำระภาษีป้าย";
            case DBD_NAME_RESERVATION_ECERT: return "จองชื่อบริษัทและขอหนังสือรับรอง e-Certificate";
            case LEGAL_FORM_GENERATION: return "สร้างเอกสารสัญญาทางกฎหมายออนไลน์";
            case LEGAL_POA_DISPATCH: return "หนังสือมอบอำนาจเฉพาะทางและจัดส่งฉบับจริง";
            case LEGAL_REMOTE_ESIGN_CONTRACT: return "ร่างสัญญา NDA / สัญญาจ้างงาน / สัญญาเช่า พร้อม e-Sign";
            case LEGAL_NOTARY_TRANSLATION_HUB: return "โนตารีพับลิค แปลเอกสารรับรองและส่งคืนไปรษณีย์";
            default: return type.name();
        }
    }

    @GetMapping
    public ResponseEntity<List<LegalServiceOrder>> getMyOrders() {
        String clerkUserId = UserContext.getCurrentUser();
        if (clerkUserId == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(orderRepository.findByClerkUserId(clerkUserId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getOrderDetails(@PathVariable Long id) {
        String clerkUserId = UserContext.getCurrentUser();
        Optional<LegalServiceOrder> orderOpt = orderRepository.findById(id);
        
        if (orderOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        LegalServiceOrder order = orderOpt.get();
        // Allow access to own order or if it is admin
        if (!order.getClerkUserId().equals(clerkUserId) && !"mock-admin-id".equals(clerkUserId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("{\"error\": \"Access denied\"}");
        }

        return ResponseEntity.ok(order);
    }

    @PostMapping("/{id}/upload")
    public ResponseEntity<?> uploadAttachment(@PathVariable Long id, @RequestParam("file") MultipartFile file) {
        String clerkUserId = UserContext.getCurrentUser();
        Optional<LegalServiceOrder> orderOpt = orderRepository.findById(id);

        if (orderOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        LegalServiceOrder order = orderOpt.get();
        if (!order.getClerkUserId().equals(clerkUserId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("{\"error\": \"Access denied\"}");
        }

        try {
            // Upload to Supabase bucket folder named after service type
            String folder = order.getServiceType().name().toLowerCase();
            String fileUrl = supabaseStorageService.uploadFile(file, folder);

            // Parse current serviceData JSON, inject file URL, and save back
            Map<String, Object> dataMap = new HashMap<>();
            if (order.getServiceData() != null && !order.getServiceData().isEmpty()) {
                dataMap = objectMapper.readValue(order.getServiceData(), Map.class);
            }
            dataMap.put("attachmentUrl", fileUrl);
            order.setServiceData(objectMapper.writeValueAsString(dataMap));
            
            // Set as documentUrl for easy clicking/viewing
            order.setDocumentUrl(fileUrl);
            orderRepository.save(order);

            return ResponseEntity.ok(Map.of("url", fileUrl));
        } catch (Exception e) {
            return ResponseEntity.status(500).body("{\"error\": \"File upload failed: " + e.getMessage() + "\"}");
        }
    }

    @GetMapping("/{id}/document/print")
    public ResponseEntity<String> printDocument(@PathVariable Long id) {
        Optional<LegalServiceOrder> orderOpt = orderRepository.findById(id);
        if (orderOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        LegalServiceOrder order = orderOpt.get();
        
        // Find user full name
        Optional<User> userOpt = userRepository.findByClerkUserId(order.getClerkUserId());
        String customerName = userOpt.isPresent() ? userOpt.get().getFullName() : "ลูกค้าผู้ใช้บริการ";
        if (customerName == null || customerName.isEmpty()) customerName = "ลูกค้าผู้ใช้บริการ";

        String htmlContent = documentGeneratorService.generateHtmlDocument(order, customerName);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.TEXT_HTML);
        
        return new ResponseEntity<>(htmlContent, headers, HttpStatus.OK);
    }

    private BigDecimal getStandardPrice(LegalServiceOrder.ServiceType type) {
        if (type == null) return BigDecimal.ZERO;
        return servicePriceRepository.findById(type)
                .map(ServicePrice::getPrice)
                .orElse(new BigDecimal("1000.00"));
    }

    @PostMapping("/bulk")
    public ResponseEntity<?> createOrdersBulk(@RequestBody List<LegalServiceOrder> orderRequests) {
        String clerkUserId = UserContext.getCurrentUser();
        if (clerkUserId == null) {
            return ResponseEntity.status(401).body("{\"error\": \"Unauthorized\"}");
        }

        List<LegalServiceOrder> savedOrders = new java.util.ArrayList<>();
        Optional<User> userRepositoryOpt = userRepository.findByClerkUserId(clerkUserId);

        for (LegalServiceOrder req : orderRequests) {
            BigDecimal servicePrice = getStandardPrice(req.getServiceType());
            LegalServiceOrder order = LegalServiceOrder.builder()
                    .clerkUserId(clerkUserId)
                    .serviceType(req.getServiceType())
                    .status(LegalServiceOrder.OrderStatus.PENDING_PAYMENT)
                    .price(servicePrice)
                    .currency("THB")
                    .serviceData(req.getServiceData())
                    .build();
            LegalServiceOrder saved = orderRepository.save(order);
            savedOrders.add(saved);

            // Send Order Creation confirmation email for each order
            if (userRepositoryOpt.isPresent()) {
                User user = userRepositoryOpt.get();
                String subject = "eDocman: ใบแจ้งงานสำหรับธุรกรรม #" + saved.getId();
                String serviceName = translateServiceType(saved.getServiceType());
                String bodyHtml = "<h3>ใบแจ้งยืนยันธุรกรรมคำขอ eDocman</h3>" +
                        "<p>เรียนคุณ " + user.getFullName() + ",</p>" +
                        "<p>ระบบได้รับคำขอทำรายการแบบฟอร์มออนไลน์สำเร็จแล้ว รายละเอียดธุรกรรมมีดังนี้:</p>" +
                        "<ul>" +
                        "<li><strong>เลขที่อ้างอิง:</strong> #" + saved.getId() + "</li>" +
                        "<li><strong>ประเภทบริการ:</strong> " + serviceName + "</li>" +
                        "<li><strong>ยอดชำระ:</strong> " + saved.getPrice() + " บาท</li>" +
                        "<li><strong>สถานะคำขอ:</strong> รอการชำระเงิน (Pending Payment)</li>" +
                        "</ul>" +
                        "<p>คุณสามารถดำเนินการเข้าสู่หน้าแดชบอร์ดเพื่อชำระเงิน หรือจัดการข้อมูลเพิ่มเติมได้ตลอดเวลา</p>" +
                        "<br><p>ขอบคุณที่ใช้บริการ,<br>ทีมงาน eDocman</p>";
                try {
                    resendEmailService.sendEmail(user.getEmail(), subject, bodyHtml);
                } catch (Exception e) {
                    System.err.println("Failed to send order email via Resend: " + e.getMessage());
                }
            }
        }

        return ResponseEntity.ok(savedOrders);
    }
}
