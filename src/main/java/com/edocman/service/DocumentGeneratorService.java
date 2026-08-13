package com.edocman.service;

import com.edocman.model.LegalServiceOrder;
import org.springframework.stereotype.Service;
import java.util.Map;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;

@Service
public class DocumentGeneratorService {

    private final ObjectMapper objectMapper = new ObjectMapper();

    public String generateHtmlDocument(LegalServiceOrder order, String customerName) {
        String serviceType = order.getServiceType().name();
        
        // Parse JSON service data
        Map<String, Object> data;
        try {
            data = objectMapper.readValue(order.getServiceData(), new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            data = Map.of();
        }

        StringBuilder html = new StringBuilder();
        
        // Shared HTML Header
        html.append("<!DOCTYPE html>\n<html>\n<head>\n");
        html.append("<meta charset=\"UTF-8\">\n");
        html.append("<title>Official Document - " + order.getServiceType() + "</title>\n");
        html.append("<style>\n");
        html.append("  body { font-family: 'Prompt', 'Sarabun', sans-serif; color: #333; margin: 0; padding: 20px; line-height: 1.6; background: #fff; }\n");
        html.append("  .document-container { max-width: 800px; margin: 0 auto; border: 1px solid #ccc; padding: 40px; position: relative; background: #fff; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }\n");
        html.append("  .garuda-seal { text-align: center; margin-bottom: 20px; }\n");
        html.append("  .garuda-seal svg { width: 80px; height: 80px; fill: red; }\n");
        html.append("  .doc-title { text-align: center; font-size: 20px; font-weight: bold; margin-bottom: 30px; text-decoration: underline; }\n");
        html.append("  .section { margin-bottom: 20px; }\n");
        html.append("  .section-title { font-weight: bold; border-bottom: 1px solid #333; margin-bottom: 10px; padding-bottom: 5px; }\n");
        html.append("  .row { display: flex; justify-content: space-between; margin-bottom: 8px; }\n");
        html.append("  .col { flex: 1; }\n");
        html.append("  .label { font-weight: bold; color: #555; }\n");
        html.append("  .value { border-bottom: 1px dotted #333; padding-left: 5px; display: inline-block; min-width: 150px; }\n");
        html.append("  .footer-signature { margin-top: 50px; text-align: right; float: right; width: 250px; }\n");
        html.append("  .signature-line { border-bottom: 1px solid #333; margin-top: 30px; height: 20px; }\n");
        html.append("  .watermark { position: absolute; top: 35%; left: 25%; transform: rotate(-30deg); font-size: 80px; color: rgba(0,128,0,0.08); font-weight: bold; pointer-events: none; border: 10px double rgba(0,128,0,0.08); padding: 10px 20px; z-index: 1000; }\n");
        html.append("  @media print {\n");
        html.append("    body { padding: 0; background: #fff; }\n");
        html.append("    .document-container { border: none; box-shadow: none; padding: 0; }\n");
        html.append("  }\n");
        html.append("</style>\n");
        html.append("</head>\n<body>\n");
        
        html.append("<div class=\"document-container\">\n");
        
        // Watermark for status
        if (order.getStatus() == LegalServiceOrder.OrderStatus.PAID || order.getStatus() == LegalServiceOrder.OrderStatus.PROCESSING) {
            html.append("  <div class=\"watermark\">PENDING GOVT APPROVAL</div>\n");
        } else if (order.getStatus() == LegalServiceOrder.OrderStatus.COMPLETED) {
            html.append("  <div class=\"watermark\" style=\"color: rgba(0, 100, 0, 0.1); border-color: rgba(0, 100, 0, 0.1);\">OFFICIAL APPROVED</div>\n");
        } else {
            html.append("  <div class=\"watermark\" style=\"color: rgba(128, 0, 0, 0.08); border-color: rgba(128, 0, 0, 0.08);\">DRAFT / UNPAID</div>\n");
        }

        // Garuda Logo SVG representation
        String garudaSvg = "<svg viewBox=\"0 0 512 512\">\n" +
                "  <path d=\"M256,0 C256,0 230,80 200,100 C170,120 120,130 90,120 C60,110 50,70 50,70 C50,70 30,120 70,160 C110,200 150,210 180,200 C210,190 230,150 256,150 C282,150 302,190 332,200 C362,210 402,200 442,160 C482,120 462,70 462,70 C462,70 452,110 422,120 C392,130 342,120 312,100 C282,80 256,0 256,0 Z\"/>\n" +
                "  <path d=\"M256,150 L256,400 L210,480 L256,512 L302,480 L256,400 Z\" style=\"fill:darkred;\"/>\n" +
                "  <circle cx=\"256\" cy=\"200\" r=\"30\" style=\"fill:#d97706;\"/>\n" +
                "</svg>";

        html.append("  <div class=\"garuda-seal\">\n" + garudaSvg + "\n  </div>\n");

        // Document specific body
        switch (order.getServiceType()) {
            case COMPANY_NAME_RESERVATION:
                generateCompanyNameReservationHtml(html, order, data, customerName);
                break;
            case COMPANY_OPENING:
                generateCompanyOpeningHtml(html, order, data, customerName);
                break;
            case COMPANY_CLOSING:
                generateCompanyClosingHtml(html, order, data, customerName);
                break;
            case DBD_E_FILING:
                generateEfilingHtml(html, order, data, customerName);
                break;
            case CAR_PRB_INSURANCE:
                generateCarPrbHtml(html, order, data, customerName);
                break;
            case HOUSE_REGISTRATION_UPDATE:
                generateHouseRegistrationHtml(html, order, data, customerName);
                break;
            case PDPA_BADGE_SETUP:
                generatePdpaBadgeHtml(html, order, data, customerName);
                break;
            case COMPANY_NAME_CHANGE:
                generateCompanyNameChangeHtml(html, order, data, customerName);
                break;
            case MEMORANDUM_AMENDMENT:
                generateMemorandumAmendmentHtml(html, order, data, customerName);
                break;
            case FINANCIAL_STATEMENT_PREP:
                generateFinancialStatementPrepHtml(html, order, data, customerName);
                break;
            case COMPANY_DIRECTOR_CHANGE:
                generateCompanyDirectorChangeHtml(html, order, data, customerName);
                break;
            case SHAREHOLDER_UPDATE:
                generateShareholderUpdateHtml(html, order, data, customerName);
                break;
        }

        // Shared Footer Signatures
        html.append("  <div class=\"footer-signature\">\n");
        html.append("    <p>ลงชื่อ / Signed: ................................................</p>\n");
        html.append("    <p style=\"text-align:center;\"> ( " + customerName + " )<br>ผู้ขอรับบริการ / Applicant</p>\n");
        html.append("    <p style=\"font-size:11px; color:#666; text-align:center;\">ยื่นเอกสารในรูปแบบอิเล็กทรอนิกส์ (Paperless e-Service)<br>วันที่ / Date: " + order.getCreatedAt().toLocalDate() + "</p>\n");
        html.append("  </div>\n");
        html.append("  <div style=\"clear:both;\"></div>\n");
        
        html.append("</div>\n</body>\n</html>");
        
        return html.toString();
    }

    private void generateCompanyNameReservationHtml(StringBuilder html, LegalServiceOrder order, Map<String, Object> data, String customerName) {
        html.append("  <div class=\"doc-title\">ใบรับรองและคำขอจองชื่อนิติบุคคล (กรมพัฒนาธุรกิจการค้า)</div>\n");
        
        html.append("  <div class=\"section\">\n");
        html.append("    <div class=\"section-title\">ข้อมูลส่วนตัวผู้ขอจอง / Applicant Details</div>\n");
        html.append("    <div class=\"row\">\n");
        html.append("      <div class=\"col\"><span class=\"label\">ชื่อผู้ขอ / Full Name:</span> <span class=\"value\">" + customerName + "</span></div>\n");
        html.append("      <div class=\"col\"><span class=\"label\">เลขบัตรประชาชน / Personal ID:</span> <span class=\"value\">" + data.getOrDefault("idCardNumber", "xxxxxxxxxxxxx") + "</span></div>\n");
        html.append("    </div>\n");
        html.append("    <div class=\"row\">\n");
        html.append("      <div class=\"col\"><span class=\"label\">เบอร์โทรศัพท์ / Tel:</span> <span class=\"value\">" + data.getOrDefault("phoneNumber", "-") + "</span></div>\n");
        html.append("      <div class=\"col\"><span class=\"label\">อีเมล / Email:</span> <span class=\"value\">" + data.getOrDefault("email", "-") + "</span></div>\n");
        html.append("    </div>\n");
        html.append("  </div>\n");

        html.append("  <div class=\"section\">\n");
        html.append("    <div class=\"section-title\">รายชื่อที่เสนอจอง (เรียงลำดับความต้องการ) / Proposed Company Names</div>\n");
        html.append("    <p><strong>ชื่อลำดับที่ 1 / Choice 1:</strong> <span class=\"value\" style=\"min-width:350px;\">" + data.getOrDefault("nameChoice1", "-") + "</span></p>\n");
        html.append("    <p><strong>ชื่อลำดับที่ 2 / Choice 2:</strong> <span class=\"value\" style=\"min-width:350px;\">" + data.getOrDefault("nameChoice2", "-") + "</span></p>\n");
        html.append("    <p><strong>ชื่อลำดับที่ 3 / Choice 3:</strong> <span class=\"value\" style=\"min-width:350px;\">" + data.getOrDefault("nameChoice3", "-") + "</span></p>\n");
        html.append("  </div>\n");

        html.append("  <div class=\"section\">\n");
        html.append("    <div class=\"section-title\">ประเภทนิติบุคคลและวัตถุประสงค์ / Entity Type & Objectives</div>\n");
        html.append("    <div class=\"row\">\n");
        html.append("      <div class=\"col\"><span class=\"label\">ประเภทธุรกิจ / Entity Type:</span> <span class=\"value\">" + data.getOrDefault("entityType", "บริษัทจำกัด (Co., Ltd.)") + "</span></div>\n");
        html.append("    </div>\n");
        html.append("    <div class=\"row\" style=\"margin-top:10px;\">\n");
        html.append("      <div class=\"col\"><span class=\"label\">วัตถุประสงค์โดยย่อ / Business Objective:</span> <span class=\"value\" style=\"width:80%; height:40px;\">" + data.getOrDefault("objective", "-") + "</span></div>\n");
        html.append("    </div>\n");
        html.append("  </div>\n");
    }

    private void generateCompanyOpeningHtml(StringBuilder html, LegalServiceOrder order, Map<String, Object> data, String customerName) {
        html.append("  <div class=\"doc-title\">คำขอจดทะเบียนจัดตั้งบริษัทจำกัด (แบบ บอจ.1)</div>\n");
        
        html.append("  <div class=\"section\">\n");
        html.append("    <div class=\"section-title\">ข้อมูลบริษัท / Corporate Details</div>\n");
        html.append("    <div class=\"row\">\n");
        html.append("      <div class=\"col\"><span class=\"label\">ชื่อบริษัท (ภาษาไทย):</span> <span class=\"value\">" + data.getOrDefault("companyNameThai", "-") + "</span></div>\n");
        html.append("    </div>\n");
        html.append("    <div class=\"row\">\n");
        html.append("      <div class=\"col\"><span class=\"label\">ชื่อบริษัท (English):</span> <span class=\"value\">" + data.getOrDefault("companyNameEng", "-") + "</span></div>\n");
        html.append("    </div>\n");
        html.append("    <div class=\"row\">\n");
        html.append("      <div class=\"col\"><span class=\"label\">ทุนจดทะเบียน / Registered Capital:</span> <span class=\"value\">" + data.getOrDefault("registeredCapital", "1,000,000") + " บาท (THB)</span></div>\n");
        html.append("      <div class=\"col\"><span class=\"label\">มูลค่าต่อหุ้น / Par Value:</span> <span class=\"value\">" + data.getOrDefault("parValue", "100") + " บาท (THB)</span></div>\n");
        html.append("    </div>\n");
        html.append("  </div>\n");

        html.append("  <div class=\"section\">\n");
        html.append("    <div class=\"section-title\">ข้อมูลที่ตั้งสำนักงานใหญ่ / Head Office Address</div>\n");
        html.append("    <p><span class=\"value\" style=\"width:100%;\">" + data.getOrDefault("address", "-") + "</span></p>\n");
        html.append("  </div>\n");

        html.append("  <div class=\"section\">\n");
        html.append("    <div class=\"section-title\">รายชื่อกรรมการและผู้ก่อการ / Directors and Promoters</div>\n");
        html.append("    <p><strong>รายนามกรรมการ / Directors:</strong></p>\n");
        html.append("    <p><span class=\"value\" style=\"width:100%;\">" + data.getOrDefault("directorsList", "-") + "</span></p>\n");
        html.append("    <p><strong>สัดส่วนการถือหุ้นสัญชาติไทย / Thai Shareholding Ratio:</strong> <span class=\"value\">" + data.getOrDefault("thaiShareRatio", "100") + " %</span></p>\n");
        html.append("  </div>\n");
    }

    private void generateCompanyClosingHtml(StringBuilder html, LegalServiceOrder order, Map<String, Object> data, String customerName) {
        html.append("  <div class=\"doc-title\">คำขอจดทะเบียนเลิกนิติบุคคลและแต่งตั้งผู้ชำระบัญชี</div>\n");
        
        html.append("  <div class=\"section\">\n");
        html.append("    <div class=\"section-title\">ข้อมูลนิติบุคคลที่เลิก / Dissolving Corporate Entity</div>\n");
        html.append("    <div class=\"row\">\n");
        html.append("      <div class=\"col\"><span class=\"label\">ชื่อบริษัท / Corporate Name:</span> <span class=\"value\">" + data.getOrDefault("companyName", "-") + "</span></div>\n");
        html.append("      <div class=\"col\"><span class=\"label\">เลขทะเบียนนิติบุคคล / Corporate Registration ID:</span> <span class=\"value\">" + data.getOrDefault("registrationNumber", "-") + "</span></div>\n");
        html.append("    </div>\n");
        html.append("  </div>\n");

        html.append("  <div class=\"section\">\n");
        html.append("    <div class=\"section-title\">ข้อมูลมติเลิกบริษัท / Dissolution Resolution Details</div>\n");
        html.append("    <div class=\"row\">\n");
        html.append("      <div class=\"col\"><span class=\"label\">วันที่ประชุมผู้ถือหุ้น / Shareholder Meeting Date:</span> <span class=\"value\">" + data.getOrDefault("meetingDate", "-") + "</span></div>\n");
        html.append("      <div class=\"col\"><span class=\"label\">สาเหตุที่เลิกบริษัท / Reason for Dissolution:</span> <span class=\"value\">" + data.getOrDefault("dissolveReason", "-") + "</span></div>\n");
        html.append("    </div>\n");
        html.append("  </div>\n");

        html.append("  <div class=\"section\">\n");
        html.append("    <div class=\"section-title\">ผู้ชำระบัญชี / Liquidator Details</div>\n");
        html.append("    <div class=\"row\">\n");
        html.append("      <div class=\"col\"><span class=\"label\">นามผู้ชำระบัญชี / Liquidator Name:</span> <span class=\"value\">" + data.getOrDefault("liquidatorName", customerName) + "</span></div>\n");
        html.append("      <div class=\"col\"><span class=\"label\">ที่ติดต่อผู้ชำระบัญชี / Contact Address:</span> <span class=\"value\">" + data.getOrDefault("liquidatorAddress", "-") + "</span></div>\n");
        html.append("    </div>\n");
        html.append("  </div>\n");
    }

    private void generateEfilingHtml(StringBuilder html, LegalServiceOrder order, Map<String, Object> data, String customerName) {
        html.append("  <div class=\"doc-title\">ใบนำส่งงบการเงินผ่านระบบอิเล็กทรอนิกส์ (DBD e-Filing Slip)</div>\n");
        
        html.append("  <div class=\"section\">\n");
        html.append("    <div class=\"section-title\">ข้อมูลนิติบุคคล / Entity Information</div>\n");
        html.append("    <div class=\"row\">\n");
        html.append("      <div class=\"col\"><span class=\"label\">ชื่อบริษัท / Company Name:</span> <span class=\"value\">" + data.getOrDefault("companyName", "-") + "</span></div>\n");
        html.append("      <div class=\"col\"><span class=\"label\">เลขทะเบียนนิติบุคคล / Registration ID:</span> <span class=\"value\">" + data.getOrDefault("registrationNumber", "-") + "</span></div>\n");
        html.append("    </div>\n");
        html.append("  </div>\n");

        html.append("  <div class=\"section\">\n");
        html.append("    <div class=\"section-title\">รายละเอียดรอบปีบัญชีที่ส่งงบ / Financial Statement Round Details</div>\n");
        html.append("    <div class=\"row\">\n");
        html.append("      <div class=\"col\"><span class=\"label\">รอบปีงบการเงิน / Financial Year Ending:</span> <span class=\"value\">" + data.getOrDefault("accountingYearEnd", "-") + "</span></div>\n");
        html.append("      <div class=\"col\"><span class=\"label\">ชื่อผู้ตรวจสอบบัญชี / Auditor Name:</span> <span class=\"value\">" + data.getOrDefault("auditorName", "-") + "</span></div>\n");
        html.append("    </div>\n");
        html.append("    <div class=\"row\">\n");
        html.append("      <div class=\"col\"><span class=\"label\">สินทรัพย์รวม (THB) / Total Assets:</span> <span class=\"value\">" + data.getOrDefault("totalAssets", "0.00") + "</span></div>\n");
        html.append("      <div class=\"col\"><span class=\"label\">รายได้รวม (THB) / Total Revenue:</span> <span class=\"value\">" + data.getOrDefault("totalRevenue", "0.00") + "</span></div>\n");
        html.append("    </div>\n");
        html.append("  </div>\n");
    }

    private void generateCarPrbHtml(StringBuilder html, LegalServiceOrder order, Map<String, Object> data, String customerName) {
        html.append("  <div class=\"doc-title\">ตารางกรมธรรม์ประกันภัยรถยนต์ภาคบังคับ (พ.ร.บ.) / Compulsory Motor Insurance Policy</div>\n");
        
        html.append("  <div class=\"section\">\n");
        html.append("    <div class=\"section-title\">ผู้เอาประกันภัย / Insured Person</div>\n");
        html.append("    <div class=\"row\">\n");
        html.append("      <div class=\"col\"><span class=\"label\">ชื่อผู้เอาประกันภัย / Name:</span> <span class=\"value\">" + customerName + "</span></div>\n");
        html.append("      <div class=\"col\"><span class=\"label\">เลขประจำตัว / ID Card:</span> <span class=\"value\">" + data.getOrDefault("idCardNumber", "-") + "</span></div>\n");
        html.append("    </div>\n");
        html.append("  </div>\n");

        html.append("  <div class=\"section\">\n");
        html.append("    <div class=\"section-title\">ข้อมูลรถยนต์ / Vehicle Details</div>\n");
        html.append("    <div class=\"row\">\n");
        html.append("      <div class=\"col\"><span class=\"label\">เลขทะเบียนรถ / License Plate:</span> <span class=\"value\">" + data.getOrDefault("licensePlate", "-") + "</span></div>\n");
        html.append("      <div class=\"col\"><span class=\"label\">จังหวัด / Province:</span> <span class=\"value\">" + data.getOrDefault("province", "-") + "</span></div>\n");
        html.append("    </div>\n");
        html.append("    <div class=\"row\">\n");
        html.append("      <div class=\"col\"><span class=\"label\">ยี่ห้อ / Brand:</span> <span class=\"value\">" + data.getOrDefault("vehicleBrand", "-") + "</span></div>\n");
        html.append("      <div class=\"col\"><span class=\"label\">เลขตัวถัง / Chassis Number:</span> <span class=\"value\">" + data.getOrDefault("chassisNumber", "-") + "</span></div>\n");
        html.append("    </div>\n");
        html.append("  </div>\n");

        html.append("  <div class=\"section\">\n");
        html.append("    <div class=\"section-title\">ระยะเวลาความคุ้มครองและเบี้ยประกัน / Coverage Period & Premium</div>\n");
        html.append("    <div class=\"row\">\n");
        html.append("      <div class=\"col\"><span class=\"label\">เริ่มคุ้มครอง / Start Date:</span> <span class=\"value\">" + data.getOrDefault("startDate", "-") + "</span></div>\n");
        html.append("      <div class=\"col\"><span class=\"label\">สิ้นสุดคุ้มครอง / End Date:</span> <span class=\"value\">" + data.getOrDefault("endDate", "-") + "</span></div>\n");
        html.append("    </div>\n");
        html.append("    <div class=\"row\">\n");
        html.append("      <div class=\"col\"><span class=\"label\">เบี้ยประกันภัยสุทธิ / Net Premium:</span> <span class=\"value\">" + order.getPrice() + " บาท (THB)</span></div>\n");
        html.append("      <div class=\"col\"><span class=\"label\">ประเภทความคุ้มครอง / Cover Type:</span> <span class=\"value\">รถยนต์นั่งส่วนบุคคลไม่เกิน 7 คน (Passenger Car)</span></div>\n");
        html.append("    </div>\n");
        html.append("  </div>\n");
    }

    private void generateHouseRegistrationHtml(StringBuilder html, LegalServiceOrder order, Map<String, Object> data, String customerName) {
        html.append("  <div class=\"doc-title\">คำร้องขอปรับปรุงแก้ไขรายการทะเบียนราษฎรและทะเบียนบ้าน</div>\n");
        
        html.append("  <div class=\"section\">\n");
        html.append("    <div class=\"section-title\">ข้อมูลที่ตั้งบ้าน / House Registration details</div>\n");
        html.append("    <div class=\"row\">\n");
        html.append("      <div class=\"col\"><span class=\"label\">รหัสประจำบ้าน / House Code ID:</span> <span class=\"value\">" + data.getOrDefault("houseCode", "-") + "</span></div>\n");
        html.append("      <div class=\"col\"><span class=\"label\">ที่อยู่ตามทะเบียน / Address:</span> <span class=\"value\">" + data.getOrDefault("address", "-") + "</span></div>\n");
        html.append("    </div>\n");
        html.append("  </div>\n");

        html.append("  <div class=\"section\">\n");
        html.append("    <div class=\"section-title\">รายละเอียดการขอปรับปรุงรายการ / Amendment Details</div>\n");
        html.append("    <div class=\"row\">\n");
        html.append("      <div class=\"col\"><span class=\"label\">ประเภทคำร้อง / Update Type:</span> <span class=\"value\">" + data.getOrDefault("requestType", "ย้ายเข้า (Moving In)") + "</span></div>\n");
        html.append("    </div>\n");
        html.append("    <div class=\"row\" style=\"margin-top:10px;\">\n");
        html.append("      <div class=\"col\"><span class=\"label\">รายชื่อบุคคลที่แจ้งจัดการ / Impacted Residents:</span> <span class=\"value\" style=\"width:100%;\">" + data.getOrDefault("residentsList", "-") + "</span></div>\n");
        html.append("    </div>\n");
        html.append("    <div class=\"row\">\n");
        html.append("      <div class=\"col\"><span class=\"label\">เอกสารแนบอ้างอิง / Supporting Uploads:</span> <span class=\"value\">" + (data.getOrDefault("attachmentUrl", null) != null ? "สำเนาบัตรประชาชน / สำเนาโฉนด" : "ไม่มีเอกสารแนบ") + "</span></div>\n");
        html.append("    </div>\n");
        html.append("  </div>\n");
    }

    private void generatePdpaBadgeHtml(StringBuilder html, LegalServiceOrder order, Map<String, Object> data, String customerName) {
        html.append("  <div class=\"doc-title\">ใบรับรองตราสัญลักษณ์ PDPA และสคริปต์ติดตั้ง (eDocman PDPA Compliant)</div>\n");
        
        html.append("  <div class=\"section\">\n");
        html.append("    <div class=\"section-title\">ข้อมูลผู้ขอติดตั้งและเว็บไซต์ / Client & Website Info</div>\n");
        html.append("    <div class=\"row\">\n");
        html.append("      <div class=\"col\"><span class=\"label\">ชื่อหน่วยงาน / Business Name:</span> <span class=\"value\">" + data.getOrDefault("businessName", customerName) + "</span></div>\n");
        html.append("      <div class=\"col\"><span class=\"label\">โดเมนเว็บไซต์ / Website URL:</span> <span class=\"value\">" + data.getOrDefault("websiteUrl", "-") + "</span></div>\n");
        html.append("    </div>\n");
        html.append("    <div class=\"row\">\n");
        html.append("      <div class=\"col\"><span class=\"label\">นโยบายความเป็นส่วนตัว / Privacy Policy URL:</span> <span class=\"value\">" + data.getOrDefault("privacyPolicyUrl", "-") + "</span></div>\n");
        html.append("      <div class=\"col\"><span class=\"label\">ตำแหน่งตราสัญลักษณ์ / Badge Style:</span> <span class=\"value\">" + data.getOrDefault("badgeStyle", "Floating (Bottom Right)") + "</span></div>\n");
        html.append("    </div>\n");
        html.append("  </div>\n");

        String badgeCode = "&lt;!-- eDocman PDPA Compliant Badge --&gt;\n" +
                "&lt;script src=\"https://www.franktest.xyz/static/edocman.js?id=PDPA-" + order.getId() + "\"&gt;&lt;/script&gt;\n" +
                "&lt;div id=\"edocman-pdpa-badge\" data-color=\"" + data.getOrDefault("badgeColor", "#10b981") + "\" data-position=\"" + data.getOrDefault("badgePosition", "right") + "\"&gt;&lt;/div&gt;";

        html.append("  <div class=\"section\">\n");
        html.append("    <div class=\"section-title\">โค้ดสคริปต์สำหรับการติดตั้ง / Installation Embed Code</div>\n");
        html.append("    <p>คัดลอกโค้ดด้านล่างนี้ไปวางไว้ที่ส่วนท้ายของแท็ก <code>&lt;body&gt;</code> ในเว็บไซต์ของคุณ:</p>\n");
        html.append("    <pre style=\"background:#f1f5f9; padding:15px; border-radius:6px; border:1px solid #cbd5e1; font-family:monospace; font-size:12px; overflow-x:auto;\">" + badgeCode + "</pre>\n");
        html.append("  </div>\n");
        
        html.append("  <div class=\"section\" style=\"margin-top:30px; text-align:center; padding:20px; border:2px dashed #10b981; background:rgba(16, 185, 129, 0.03); border-radius:10px;\">\n");
        html.append("    <h3 style=\"color:#047857; margin-top:0;\"><i class=\"fa-solid fa-circle-check\"></i> ใบรับรองการติดตั้งระบบ PDPA สำเร็จ</h3>\n");
        html.append("    <p style=\"font-size:14px; margin:5px 0;\">เว็บไซต์นี้ได้ดำเนินการลงทะเบียนติดตั้งตราสัญลักษณ์คุ้มครองข้อมูลส่วนบุคคล (PDPA Compliant Badge) เรียบร้อยแล้ว</p>\n");
        html.append("    <p style=\"font-size:13px; font-weight:bold;\">eDocman Certification ID: ED-PDPA-" + String.format("%06d", order.getId()) + "</p>\n");
        html.append("  </div>\n");
    }

    private void generateCompanyNameChangeHtml(StringBuilder html, LegalServiceOrder order, Map<String, Object> data, String customerName) {
        html.append("  <div class=\"doc-title\">คำขอจดทะเบียนแก้ไขเพิ่มเติมชื่อนิติบุคคล (กรมพัฒนาธุรกิจการค้า)</div>\n");
        
        html.append("  <div class=\"section\">\n");
        html.append("    <div class=\"section-title\">ข้อมูลเดิมและคำร้องขอ / Existing Entity Details</div>\n");
        html.append("    <div class=\"row\">\n");
        html.append("      <div class=\"col\"><span class=\"label\">ชื่อเดิมภาษาไทย / Old Name (TH):</span> <span class=\"value\">" + data.getOrDefault("oldCompanyNameThai", "-") + "</span></div>\n");
        html.append("      <div class=\"col\"><span class=\"label\">เลขทะเบียนนิติบุคคล / Registration ID:</span> <span class=\"value\">" + data.getOrDefault("companyId", "xxxxxxxxxxxxx") + "</span></div>\n");
        html.append("    </div>\n");
        html.append("  </div>\n");

        html.append("  <div class=\"section\">\n");
        html.append("    <div class=\"section-title\">ข้อมูลชื่อใหม่ที่เสนอเปลี่ยน / New Entity Names</div>\n");
        html.append("    <p><strong>ชื่อใหม่ภาษาไทย / New Name (Thai):</strong> <span class=\"value\" style=\"min-width:350px;\">" + data.getOrDefault("newCompanyNameThai", "-") + "</span></p>\n");
        html.append("    <p><strong>ชื่อใหม่ภาษาอังกฤษ / New Name (English):</strong> <span class=\"value\" style=\"min-width:350px;\">" + data.getOrDefault("newCompanyNameEng", "-") + "</span></p>\n");
        html.append("  </div>\n");

        html.append("  <div class=\"section\">\n");
        html.append("    <div class=\"section-title\">มติคณะกรรมการ / Board Resolution Info</div>\n");
        html.append("    <div class=\"row\">\n");
        html.append("      <div class=\"col\"><span class=\"label\">วันที่ประชุมผู้ถือหุ้น / Shareholder Meeting Date:</span> <span class=\"value\">" + data.getOrDefault("resolutionDate", "-") + "</span></div>\n");
        html.append("      <div class=\"col\"><span class=\"label\">พยานบุคคลร่วมลงนาม / Witness Name:</span> <span class=\"value\">" + data.getOrDefault("witnessName", "-") + "</span></div>\n");
        html.append("    </div>\n");
        html.append("  </div>\n");
    }

    private void generateMemorandumAmendmentHtml(StringBuilder html, LegalServiceOrder order, Map<String, Object> data, String customerName) {
        html.append("  <div class=\"doc-title\">คำขอแก้ไขเพิ่มเติมหนังสือบริคณห์สนธิ (กรมพัฒนาธุรกิจการค้า)</div>\n");
        
        html.append("  <div class=\"section\">\n");
        html.append("    <div class=\"section-title\">รายละเอียดนิติบุคคล / Corporate Info</div>\n");
        html.append("    <div class=\"row\">\n");
        html.append("      <div class=\"col\"><span class=\"label\">ชื่อบริษัท / Company Name:</span> <span class=\"value\">" + data.getOrDefault("companyName", "-") + "</span></div>\n");
        html.append("      <div class=\"col\"><span class=\"label\">เลขทะเบียนนิติบุคคล / Registration ID:</span> <span class=\"value\">" + data.getOrDefault("companyId", "xxxxxxxxxxxxx") + "</span></div>\n");
        html.append("    </div>\n");
        html.append("  </div>\n");

        html.append("  <div class=\"section\">\n");
        html.append("    <div class=\"section-title\">ข้อความที่แก้ไขเพิ่มเติม / MOA Amendment Details</div>\n");
        html.append("    <p><strong>ข้อที่ขอแก้ไข (เช่น วัตถุประสงค์ หรือ ทุนเรือนหุ้น):</strong> <span class=\"value\" style=\"min-width:350px;\">" + data.getOrDefault("amendedArticles", "แก้ไขวัตถุประสงค์ของบริษัท") + "</span></p>\n");
        html.append("    <div class=\"row\" style=\"margin-top:10px;\">\n");
        html.append("      <div class=\"col\"><span class=\"label\">รายละเอียดวัตถุประสงค์ที่เพิ่มเติม / Detailed objective or capital details:</span></div>\n");
        html.append("    </div>\n");
        html.append("    <p><span class=\"value\" style=\"width:100%; min-height:80px; display:block;\">" + data.getOrDefault("amendmentTextDetails", "-") + "</span></p>\n");
        html.append("  </div>\n");

        html.append("  <div class=\"section\">\n");
        html.append("    <div class=\"section-title\">มติคณะกรรมการ / Board Resolution Info</div>\n");
        html.append("    <div class=\"row\">\n");
        html.append("      <div class=\"col\"><span class=\"label\">วันที่ประชุมคณะกรรมการ / Resolution Date:</span> <span class=\"value\">" + data.getOrDefault("resolutionDate", "-") + "</span></div>\n");
        html.append("    </div>\n");
        html.append("  </div>\n");
    }

    private void generateFinancialStatementPrepHtml(StringBuilder html, LegalServiceOrder order, Map<String, Object> data, String customerName) {
        html.append("  <div class=\"doc-title\">ใบนำส่งงบการเงินและรายละเอียดผู้ทำบัญชี (กรมพัฒนาธุรกิจการค้า)</div>\n");
        
        html.append("  <div class=\"section\">\n");
        html.append("    <div class=\"section-title\">ข้อมูลกิจการและผู้มีอำนาจ / Corporate Details</div>\n");
        html.append("    <div class=\"row\">\n");
        html.append("      <div class=\"col\"><span class=\"label\">ชื่อบริษัท / Company Name:</span> <span class=\"value\">" + data.getOrDefault("companyName", "-") + "</span></div>\n");
        html.append("      <div class=\"col\"><span class=\"label\">เลขทะเบียนนิติบุคคล / Registration ID:</span> <span class=\"value\">" + data.getOrDefault("companyId", "xxxxxxxxxxxxx") + "</span></div>\n");
        html.append("    </div>\n");
        html.append("  </div>\n");

        html.append("  <div class=\"section\">\n");
        html.append("    <div class=\"section-title\">รอบบัญชีและข้อมูลทางการเงิน / Financial Statements Summary</div>\n");
        html.append("    <div class=\"row\">\n");
        html.append("      <div class=\"col\"><span class=\"label\">รอบปีงบการเงิน / Accounting Year Period:</span> <span class=\"value\">" + data.getOrDefault("accountingPeriod", "2568") + "</span></div>\n");
        html.append("      <div class=\"col\"><span class=\"label\">จำนวนพนักงาน / Number of Employees:</span> <span class=\"value\">" + data.getOrDefault("employeeCount", "-") + "</span></div>\n");
        html.append("    </div>\n");
        html.append("    <div class=\"row\">\n");
        html.append("      <div class=\"col\"><span class=\"label\">รายได้รวม (บาท) / Total Revenue:</span> <span class=\"value\">" + data.getOrDefault("totalRevenue", "-") + "</span></div>\n");
        html.append("      <div class=\"col\"><span class=\"label\">สินทรัพย์รวม (บาท) / Total Assets:</span> <span class=\"value\">" + data.getOrDefault("totalAssets", "-") + "</span></div>\n");
        html.append("    </div>\n");
        html.append("  </div>\n");

        html.append("  <div class=\"section\">\n");
        html.append("    <div class=\"section-title\">ผู้ทำบัญชีและผู้ตรวจสอบ / CPA Auditor Assignment</div>\n");
        html.append("    <div class=\"row\">\n");
        html.append("      <div class=\"col\"><span class=\"label\">ผู้ส่งงบ (CPA/TA) / CPA Assigned:</span> <span class=\"value\">" + data.getOrDefault("cpaName", "บริษัทจัดหาตรวจสอบบัญชี eDocman (CPA หุ้นส่วน)") + "</span></div>\n");
        html.append("    </div>\n");
        html.append("  </div>\n");
    }

    private void generateCompanyDirectorChangeHtml(StringBuilder html, LegalServiceOrder order, Map<String, Object> data, String customerName) {
        html.append("  <div class=\"doc-title\">คำขอจดทะเบียนแก้ไขเพิ่มเติมกรรมการและอำนาจกรรมการ (กรมพัฒนาธุรกิจการค้า)</div>\n");
        
        html.append("  <div class=\"section\">\n");
        html.append("    <div class=\"section-title\">ข้อมูลกิจการ / Corporate Details</div>\n");
        html.append("    <div class=\"row\">\n");
        html.append("      <div class=\"col\"><span class=\"label\">ชื่อบริษัท / Company Name:</span> <span class=\"value\">" + data.getOrDefault("companyName", "-") + "</span></div>\n");
        html.append("      <div class=\"col\"><span class=\"label\">เลขทะเบียนนิติบุคคล / Registration ID:</span> <span class=\"value\">" + data.getOrDefault("companyId", "xxxxxxxxxxxxx") + "</span></div>\n");
        html.append("    </div>\n");
        html.append("  </div>\n");

        html.append("  <div class=\"section\">\n");
        html.append("    <div class=\"section-title\">การเปลี่ยนแปลงรายชื่อกรรมการ / Director Amendments</div>\n");
        html.append("    <p><strong>กรรมการที่ออก / Outgoing Director:</strong> <span class=\"value\" style=\"min-width:300px;\">" + data.getOrDefault("outgoingDirector", "-") + "</span></p>\n");
        html.append("    <p><strong>กรรมการที่เข้าใหม่ (เจ้าของคนใหม่) / Incoming Director:</strong> <span class=\"value\" style=\"min-width:300px;\">" + data.getOrDefault("incomingDirector", "-") + "</span></p>\n");
        html.append("  </div>\n");

        html.append("  <div class=\"section\">\n");
        html.append("    <div class=\"section-title\">การแก้ไขอำนาจกรรมการลงนาม / Authorized Signatory Power</div>\n");
        html.append("    <p><span class=\"value\" style=\"width:100%; min-height:60px; display:block;\">" + data.getOrDefault("signatoryPower", "-") + "</span></p>\n");
        html.append("  </div>\n");

        html.append("  <div class=\"section\">\n");
        html.append("    <div class=\"section-title\">มติที่ประชุม / Shareholder Meeting</div>\n");
        html.append("    <div class=\"row\">\n");
        html.append("      <div class=\"col\"><span class=\"label\">วันที่จัดประชุม / Meeting Date:</span> <span class=\"value\">" + data.getOrDefault("resolutionDate", "-") + "</span></div>\n");
        html.append("    </div>\n");
        html.append("  </div>\n");
    }

    private void generateShareholderUpdateHtml(StringBuilder html, LegalServiceOrder order, Map<String, Object> data, String customerName) {
        html.append("  <div class=\"doc-title\">บัญชีรายชื่อผู้ถือหุ้นของบริษัทจำกัด (แบบ บอจ.5)</div>\n");
        
        html.append("  <div class=\"section\">\n");
        html.append("    <div class=\"section-title\">รายละเอียดนิติบุคคล / Corporate Info</div>\n");
        html.append("    <div class=\"row\">\n");
        html.append("      <div class=\"col\"><span class=\"label\">ชื่อบริษัท / Company Name:</span> <span class=\"value\">" + data.getOrDefault("companyName", "-") + "</span></div>\n");
        html.append("      <div class=\"col\"><span class=\"label\">เลขทะเบียนนิติบุคคล / Registration ID:</span> <span class=\"value\">" + data.getOrDefault("companyId", "xxxxxxxxxxxxx") + "</span></div>\n");
        html.append("    </div>\n");
        html.append("    <div class=\"row\">\n");
        html.append("      <div class=\"col\"><span class=\"label\">ทุนจดทะเบียนรวม / Total Capital:</span> <span class=\"value\">" + data.getOrDefault("totalCapital", "-") + " บาท</span></div>\n");
        html.append("      <div class=\"col\"><span class=\"label\">จำนวนหุ้นทั้งหมด / Total Shares:</span> <span class=\"value\">" + data.getOrDefault("totalShares", "-") + " หุ้น</span></div>\n");
        html.append("    </div>\n");
        html.append("  </div>\n");

        html.append("  <div class=\"section\">\n");
        html.append("    <div class=\"section-title\">บัญชีรายชื่อผู้ถือหุ้นที่เพิ่มเติมหรือโอน / Shareholder List (บอจ.5 Update)</div>\n");
        html.append("<table style=\"width:100%; border-collapse:collapse; margin-top:10px; font-size:12px;\">\n" +
                "  <thead>\n" +
                "    <tr style=\"background:#f1f5f9;\">\n" +
                "      <th style=\"border:1px solid #ccc; padding:8px;\">ลำดับ / No.</th>\n" +
                "      <th style=\"border:1px solid #ccc; padding:8px;\">ชื่อ-สกุล / Full Name</th>\n" +
                "      <th style=\"border:1px solid #ccc; padding:8px;\">เลขประจำตัวประชาชน / ID</th>\n" +
                "      <th style=\"border:1px solid #ccc; padding:8px;\">จำนวนหุ้นที่ถือ / Shares</th>\n" +
                "    </tr>\n" +
                "  </thead>\n" +
                "  <tbody>\n" +
                "    <tr>\n" +
                "      <td style=\"border:1px solid #ccc; padding:8px; text-align:center;\">1</td>\n" +
                "      <td style=\"border:1px solid #ccc; padding:8px;\">" + data.getOrDefault("shareholderName1", "-") + "</td>\n" +
                "      <td style=\"border:1px solid #ccc; padding:8px; text-align:center;\">" + data.getOrDefault("shareholderId1", "-") + "</td>\n" +
                "      <td style=\"border:1px solid #ccc; padding:8px; text-align:center;\">" + data.getOrDefault("shareholderShares1", "-") + " หุ้น</td>\n" +
                "    </tr>\n" +
                "    <tr>\n" +
                "      <td style=\"border:1px solid #ccc; padding:8px; text-align:center;\">2</td>\n" +
                "      <td style=\"border:1px solid #ccc; padding:8px;\">" + data.getOrDefault("shareholderName2", "-") + "</td>\n" +
                "      <td style=\"border:1px solid #ccc; padding:8px; text-align:center;\">" + data.getOrDefault("shareholderId2", "-") + "</td>\n" +
                "      <td style=\"border:1px solid #ccc; padding:8px; text-align:center;\">" + data.getOrDefault("shareholderShares2", "-") + " หุ้น</td>\n" +
                "    </tr>\n" +
                "  </tbody>\n" +
                "</table>");
        html.append("  </div>\n");
    }
}
